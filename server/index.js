const express = require('express');
const multer = require('multer');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn, exec } = require('child_process');

const { indexFile, deleteFileFromIndex, buildRAGPrompt, getIndexStatus, cleanOrphanChunks, clearIndex } = require('./rag');

const app = express();
const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434/api/chat';
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
        stdio: 'ignore',
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
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { num_predict: 2048, temperature: 0.7 },
    }, { timeout: 180000 });
    return response.data.message?.content ?? '';
}

// ── Improved system prompt builder ────────────────────────────────────────────

function buildSystemPrompt(hasContext, ragContext) {
    const base = `You are Edusaku, an intelligent, warm, and empowering offline-first AI education assistant built specifically for teachers and students in areas with limited or no internet access. You deeply understand educational needs and adapt your communication style to the user's level — whether they are a primary school student, a high school student, or a teacher.

Always respond in the same language the user is writing in. This includes but is not limited to Indonesian, English, Javanese, Sundanese, Arabic, or any other language. Never restrict yourself to only two languages.

Core principles:
- Prioritize clarity and accuracy above all. Never guess or hallucinate facts.
- If you do not know something, say so honestly rather than making something up.
- Adapt your tone: friendly and simple for students, professional and structured for teachers.
- When answering questions, think step by step before giving the final answer.
- If the user's question is ambiguous, ask one short clarifying question before proceeding.
- Always cite the document source when answering from uploaded context.
- Use markdown formatting thoughtfully: use tables for comparisons, bullet points for lists, and code blocks for technical content. Do not over-format simple conversational replies.

Your capabilities:
- You run entirely locally and offline on the user's device — no internet required.
- You can read and analyze documents (PDF, DOCX, TXT) uploaded by the user via Document Library, processed with local OCR and RAG.
- Users can upload files from their device or wirelessly from a mobile phone by scanning a QR code.
- You support multi-session chats with pinned sessions, auto-generated titles, and persistent history.
- You use a local vector database (Vectra + MiniLM embeddings) for efficient document retrieval.
- Users can bookmark your responses, give feedback via like/dislike, and edit or retry their messages.
- Storage usage including chat sessions, documents, and vector index can be monitored and cleared by the user.

Important limitations to be honest about:
- You cannot access the internet or any external service.
- You cannot directly view images sent in chat — images must be uploaded to Document Library for OCR processing.
- You cannot remember conversations from previous sessions unless the user re-uploads context.`;

    if (hasContext) return base + `\n\nThe following content has been retrieved from the user's uploaded documents. Prioritize this information when answering. If the answer is not found in the context, say so and answer from your general knowledge:\n\n${ragContext}`;
    return base;
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

const LOCAL_IP = getLocalIpAddress();
const SERVER_URL = `http://${LOCAL_IP}:${PORT}`;

// ── Upload dir ────────────────────────────────────────────────────────────────

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
        message: 'File uploaded successfully',
        filename: req.file.filename,
        path: req.file.path,
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

// Delete ALL files
app.delete('/files', async (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
            fs.unlinkSync(path.join(uploadDir, file));
        }
        res.json({ message: 'All files deleted successfully' });
    } catch (error) {
        console.error('[Delete All Files] Error:', error);
        res.status(500).json({ error: 'Failed to delete files' });
    }
});

// Delete ALL vector index
app.delete('/index', async (req, res) => {
    try {
        await clearIndex();
        res.json({ message: 'Vector index cleared successfully' });
    } catch (error) {
        console.error('[Delete Index] Error:', error);
        res.status(500).json({ error: 'Failed to clear vector index' });
    }
});

// RAG-augmented chat (non-streaming, kept for compatibility)
app.post('/chat', async (req, res) => {
    const { prompt, history = [], images = [] } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    try {
        const ragContext = await buildRAGPrompt(prompt);
        const hasContext = ragContext !== prompt;

        const cleanImages = Array.isArray(images)
            ? images.map(img => img.includes(',') ? img.split(',')[1] : img)
            : [];

        const mappedHistory = history.slice(-10).map(m => {
            const role = m.role === 'user' ? 'user' : 'assistant';
            const content = Array.isArray(m.content) ? m.content.find(c => c.type === 'text')?.text || '' : m.content || '';
            return { role, content };
        });

        const messages = [
            { role: 'system', content: buildSystemPrompt(hasContext, hasContext ? ragContext : '') },
            ...mappedHistory,
            { role: 'user', content: prompt, ...(cleanImages.length > 0 ? { images: cleanImages } : {}) }
        ];
        const answer = await generateAnswer(messages);
        res.json({ response: answer });
    } catch (error) {
        console.error('[Chat] Error:', error.message);
        res.status(500).json({ error: 'AI model failed to generate a response.', detail: error.message });
    }
});

// SSE streaming chat ──────────────────────────────────────────────────────────
app.post('/chat/stream', async (req, res) => {
    const { prompt, history = [], images = [] } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    try {
        const ragContext = await buildRAGPrompt(prompt);
        const hasContext = ragContext !== prompt;

        const cleanImages = Array.isArray(images)
            ? images.map(img => img.includes(',') ? img.split(',')[1] : img)
            : [];

        const mappedHistory = history.slice(-10).map(m => {
            const role = m.role === 'user' ? 'user' : 'assistant';
            const content = Array.isArray(m.content) ? m.content.find(c => c.type === 'text')?.text || '' : m.content || '';
            return { role, content };
        });

        const messages = [
            { role: 'system', content: buildSystemPrompt(hasContext, hasContext ? ragContext : '') },
            ...mappedHistory,
            { role: 'user', content: prompt, ...(cleanImages.length > 0 ? { images: cleanImages } : {}) },
        ];

        if (!_ollamaReady) await ensureOllama();

        const ollamaRes = await axios.post(OLLAMA_URL, {
            model: OLLAMA_MODEL,
            messages,
            stream: true,
            options: { num_predict: 2048, temperature: 0.7 },
        }, { responseType: 'stream', timeout: 180000 });

        let buf = '';
        ollamaRes.data.on('data', (chunk) => {
            buf += chunk.toString();
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    const token = parsed.message?.content || '';
                    if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
                    if (parsed.done) res.write('data: [DONE]\n\n');
                } catch { }
            }
        });

        ollamaRes.data.on('end', () => {
            res.write('data: [DONE]\n\n');
            res.end();
        });

        ollamaRes.data.on('error', (err) => {
            console.error('[Stream] Ollama error:', err.message);
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        });
        req.on('close', () => ollamaRes.data.destroy());
    } catch (error) {
        console.error('[Chat/Stream] Error:', error.message, error.response?.data);
        res.write(`data: ${JSON.stringify({ token: `**Error:** ${error.message}` })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
});

// Usage / storage stats ───────────────────────────────────────────────────────
app.get('/usage', async (req, res) => {
    const getFolderSize = (dir) => {
        if (!fs.existsSync(dir)) return 0;
        let total = 0;
        for (const f of fs.readdirSync(dir)) {
            const fp = path.join(dir, f);
            const s = fs.statSync(fp);
            total += s.isDirectory() ? getFolderSize(fp) : s.size;
        }
        return total;
    };
    try {
        const uploadsSize = getFolderSize(uploadDir);
        const vectorSize = getFolderSize(path.join(__dirname, 'vector_index'));
        const status = await getIndexStatus();
        const fileCount = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).length : 0;
        res.json({
            documents: { sizeBytes: uploadsSize, count: fileCount },
            vectors: { sizeBytes: vectorSize, chunkCount: status.totalChunks },
            total: { sizeBytes: uploadsSize + vectorSize },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// Feedback Endpoint
app.post('/feedback', express.json({ limit: '50mb' }), (req, res) => {
    try {
        const { feedback } = req.body;
        if (!feedback) return res.status(400).json({ error: 'Feedback data required' });

        const feedbackFile = path.join(__dirname, 'feedback.json');
        let data = [];
        if (fs.existsSync(feedbackFile)) {
            data = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
        }

        data.push({
            ...feedback,
            timestamp: new Date().toISOString(),
        });

        fs.writeFileSync(feedbackFile, JSON.stringify(data, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        console.error('[Feedback] Error saving feedback:', err.message);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});
// Ollama status — checks if Ollama is running and if gemma4:e2b is installed
app.get('/ollama/status', async (req, res) => {
    let ollamaRunning = false;
    let modelInstalled = false;

    try {
        await axios.get('http://localhost:11434/', { timeout: 2000 });
        ollamaRunning = true;
    } catch (_) {}

    if (ollamaRunning) {
        try {
            const output = await new Promise((resolve, reject) => {
                exec('ollama list', (err, stdout) => err ? reject(err) : resolve(stdout));
            });
            modelInstalled = output.includes('gemma4');
        } catch (_) {}
    }

    res.json({ ollamaRunning, modelInstalled });
});

// Ollama install — streams `ollama pull gemma4:e2b` output as SSE
app.post('/ollama/install', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    const proc = spawn('ollama', ['pull', 'gemma4:e2b']);

    const sendLines = (data) => {
        const lines = data.toString().split(/[\r\n]+/).filter(l => l.trim());
        const last = lines[lines.length - 1];
        if (last) res.write(`data: ${JSON.stringify({ text: last })}\n\n`);
    };

    proc.stdout.on('data', sendLines);
    proc.stderr.on('data', sendLines);

    proc.on('close', (code) => {
        res.write(`data: ${JSON.stringify({ done: true, success: code === 0 })}\n\n`);
        res.end();
    });

    req.on('close', () => proc.kill());
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
                    // Clean orphan chunks (files deleted without using the DELETE endpoint)
                    const uploaded = fs.readdirSync(uploadDir);
                    const removed = await cleanOrphanChunks(uploaded);
                    if (removed > 0) console.log(`[RAG] Cleaned ${removed} orphan chunk(s).`);

                    // Index any new unindexed files
                    const { files: indexed } = await getIndexStatus();
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
