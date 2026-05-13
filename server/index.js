const express = require('express');
const multer = require('multer');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434/api/generate';

/**
 * Get the local IP address of the machine
 */
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
}

const LOCAL_IP = getLocalIpAddress();
const SERVER_URL = `http://${LOCAL_IP}:${PORT}`;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));
// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Ping endpoint to test connection
app.get('/ping', (req, res) => {
    res.json({ status: 'ok', message: 'Edusaku Server is online', ip: LOCAL_IP });
});

// List uploaded files
app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to list files' });
        }
        const fileList = files.map(file => ({
            name: file,
            timestamp: fs.statSync(path.join(uploadDir, file)).mtime
        })).sort((a, b) => b.timestamp - a.timestamp);
        
        res.json({ files: fileList });
    });
});

// AI Chat endpoint (proxies to Ollama)
app.post('/chat', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: 'gemma4:e2b',
            prompt: prompt,
            stream: false
        });
        res.json({ response: response.data.response });
    } catch (error) {
        console.error('AI Chat Error:', error.message);
        res.status(500).json({ error: 'AI model is not responding. Make sure Ollama is running.' });
    }
});

// Upload endpoint
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log(`Received file: ${req.file.filename}`);
    res.json({
        message: 'File uploaded successfully',
        filename: req.file.filename,
        path: req.file.path
    });
});

// Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`Edusaku Web App running at:`);
    console.log(`URL: ${SERVER_URL}`);
    console.log(`IP:  ${LOCAL_IP}`);
    console.log(`PORT: ${PORT}`);
    console.log(`-----------------------------------------`);
    console.log(`Open the URL above in your browser.`);
});
