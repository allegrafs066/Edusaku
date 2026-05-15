const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const os      = require('os');
const path    = require('path');
const fs      = require('fs');
const axios   = require('axios');
const { spawn } = require('child_process');

const { indexFile, deleteFileFromIndex, buildRAGPrompt, getIndexStatus } = require('./rag');

const app  = express();
const PORT = 3000;
const OLLAMA_URL   = 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = 'gemma4:e2b';

// ── Auto-start Ollama if it isn't already running ─────────────────────────────

let _ollamaReady = false;

async function ensureOllama() {
    try {
        await axios.get('http://localhost:11434/', { timeout: 2000 });
        _ollamaReady = true;
        console.log('[LLM] Ollama already running.');
        return;
    } catch (_) { /* not running yet */ }

    console.log('[LLM] Starting Ollama in background…');
    const proc = spawn('ollama', ['serve'], {
        detached: true,
        stdio:    'ignore',
        windowsHide: true,
    });
    proc.unref();

    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 500));
        try {
            await axios.get('http://localhost:11434/', { timeout: 1000 });
            _ollamaReady = true;
            console.log('[LLM] Ollama ready.');
            return;
        } catch (_) { /* still starting */ }
    }
    console.warn('[LLM] Ollama did not start in time — chat may fail on first request.');
}

/**
 * Call Ollama's /api/chat endpoint.
 * @param {Array<{role:string, content:string}>} messages  Full message array.
 */
async function generateAnswer(messages) {
    if (!_ollamaReady) await ensureOllama();
    const response = await axios.post(OLLAMA_URL, {
        model:    OLLAMA_MODEL,
        messages,
        stream:   false,
        options: {
            num_predict: 512,
            temperature: 0.7,
        },
    }, { timeout: 180000 });
    return response.data.message?.content ?? '';
}

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
    const { prompt, history = [] } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
        // Retrieve relevant document chunks for this query
        const ragContext = await buildRAGPrompt(prompt);
        const hasContext = ragContext !== prompt;

        // Build Ollama messages array
        const messages = [];

        // System message
        messages.push({
            role: 'system',
            content: hasContext
                ? 'You are Edusaku, a helpful educational AI assistant. Use the following document context to answer accurately:\n\n' + ragContext
                : 'You are Edusaku, a helpful educational AI assistant.',
        });

        // Prior conversation turns (last 10 to stay within context)
        for (const msg of history.slice(-10)) {
            messages.push({
                role:    msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content,
            });
        }

        // Current user message
        messages.push({ role: 'user', content: prompt });

        const answer = await generateAnswer(messages);
        res.json({ response: answer });
    } catch (error) {
        console.error('[Chat] Error:', error.message);
        res.status(500).json({
            error: 'AI model failed to generate a response.',
            detail: error.message,
        });
    }
});

// RAG status endpoint
app.get('/rag/status', async (req, res) => {
    const status = await getIndexStatus();
    res.json(status);
});

// Manually trigger re-index of a file
app.post('/rag/reindex/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    res.json({ message: 'Re-indexing started', filename });
    // Run in background
    deleteFileFromIndex(filename)
        .then(() => indexFile(filePath, filename))
        .catch(err => console.error('[Reindex] Error:', err.message));
});
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

    setTimeout(async () => {
        try {
            await Promise.all([
                ensureOllama(),
                (async () => {
                    const { files: indexed } = await getIndexStatus();
                    const uploaded = fs.readdirSync(uploadDir);
                    const toIndex = uploaded.filter(f => !indexed[f]);
                    if (toIndex.length > 0) {
                        console.log(`[RAG] Found ${toIndex.length} unindexed file(s), indexing now…`);
                        for (const filename of toIndex) {
                            const filePath = path.join(uploadDir, filename);
                            await indexFile(filePath, filename).catch(e =>
                                console.error(`[RAG] Failed to index ${filename}:`, e.message)
                            );
                        }
                    } else {
                        console.log('[RAG] All files already indexed.');
                    }
                })(),
            ]);
        } catch (err) {
            console.error('[Startup] Error:', err.message);
        }
    }, 1000);
});
