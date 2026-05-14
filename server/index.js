const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const os      = require('os');
const path    = require('path');
const fs      = require('fs');
const axios   = require('axios');

const { indexFile, deleteFileFromIndex, buildRAGPrompt } = require('./rag');

const app  = express();
const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434/api/generate';

// ── IP helper ─────────────────────────────────────────────────────────────────

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '0.0.0.0';
}

const LOCAL_IP  = getLocalIpAddress();
const SERVER_URL = `http://${LOCAL_IP}:${PORT}`;

// ── Upload dir ────────────────────────────────────────────────────────────────

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
        const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, suffix + '-' + file.originalname);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB — PDFs can be large
});

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));
app.use('/uploads', express.static(uploadDir));

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/ping', (req, res) => {
    res.json({ status: 'ok', message: 'Edusaku Server is online', ip: LOCAL_IP });
});

// List uploaded files
app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list files' });
        const list = files
            .map(f => ({ name: f, timestamp: fs.statSync(path.join(uploadDir, f)).mtime }))
            .sort((a, b) => b.timestamp - a.timestamp);
        res.json({ files: list });
    });
});

// Upload + auto-index for RAG
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log(`[Upload] Received: ${req.file.filename}`);
    res.json({
        message:  'File uploaded successfully',
        filename: req.file.filename,
        path:     req.file.path,
        indexing: true, // client can show "processing" state
    });

    // Index in background — don't block the upload response
    indexFile(req.file.path, req.file.filename).catch(err => {
        console.error('[Upload] Indexing error:', err.message);
    });
});

// Delete file + remove from vector index
app.delete('/files/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    fs.unlink(filePath, async (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete file' });

        // Remove from vector index
        deleteFileFromIndex(filename).catch(e =>
            console.error('[Delete] Index cleanup error:', e.message)
        );

        res.json({ message: 'File deleted successfully' });
    });
});

// RAG-augmented chat
app.post('/chat', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
        // Build prompt with retrieved document context
        const augmentedPrompt = await buildRAGPrompt(prompt);

        const response = await axios.post(OLLAMA_URL, {
            model:  'gemma4:e2b',
            prompt: augmentedPrompt,
            stream: false,
        });

        res.json({ response: response.data.response });
    } catch (error) {
        console.error('[Chat] Error:', error.message);
        res.status(500).json({
            error: 'AI model is not responding. Make sure Ollama is running.',
        });
    }
});

// Catch-all → React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
    console.log('-----------------------------------------');
    console.log('Edusaku Server running at:');
    console.log(`URL:  ${SERVER_URL}`);
    console.log(`PORT: ${PORT}`);
    console.log('-----------------------------------------');
    console.log('RAG pipeline: active (Tesseract OCR + MiniLM embeddings + Vectra)');
});
