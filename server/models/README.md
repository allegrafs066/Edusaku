# Models

Place your GGUF model file here:

```
server/models/gemma4-e2b-q4.gguf
```

## Download

Get the Q4_K_M quantized version of Gemma 4 E2B from Hugging Face:

https://huggingface.co/google/gemma-4-e2b-it-GGUF

The server expects the filename: `google_gemma-4-E2B-it-Q4_K_M.gguf`

## Why this folder?

`node-llama-cpp` loads the model directly from disk — no Ollama or any other
external process required. The model loads once on server startup and stays
in memory for the lifetime of the process.
