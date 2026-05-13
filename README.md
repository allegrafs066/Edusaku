# Edusaku AI Model Setup

This project uses a local AI model for document understanding and chatting. To set up the AI model, please follow these steps:

### 1. Install Ollama
Download and install [Ollama](https://ollama.com/) on your machine.

### 2. Pull the Model
Open your terminal and run the following command to download the required Gemma 4 model:

```bash
ollama pull gemma4:e2b
```

### 3. Place the Model in the Assets Directory
Once downloaded, you need to extract or locate the physical `.gguf` model file (it is roughly 7GB). Move this file into the following directory inside this project:

```text
android/app/src/main/assets/models/
```

> **Note:** Make sure the file is named `gemma4-e2b-q4.gguf` so the app's inference service can find it properly. This directory is intentionally ignored by Git so the large file won't be tracked.
