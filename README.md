---
# 🎙️ Real-Time Voice Recognition with WebSockets

A lightweight system for **live speech-to-text transcription** using WebSockets. The project streams microphone audio to the backend, transcribes it in real-time, and displays the results instantly in the browser.
---

## ✨ Features

- 🎤 **Microphone recording** directly in the browser
- 🔗 **WebSocket streaming** for low-latency communication
- 📝 **Real-time transcription** (word-by-word / sentence-by-sentence)
- 📜 **Final transcripts panel** with auto-scrolling
- ⚡ Powered by **Django Channels** and a modular `voice` engine

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/voice-realtime-transcription.git
cd voice-realtime-transcription
```

### 2. Backend setup (Django + Channels)

```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Run the Django server (with Daphne or Uvicorn):

```bash
daphne your_project.asgi:application --port 8000
```

### 3. Frontend setup

Simply open the `index.html` in your browser, or serve it locally:

```bash
python -m http.server 8080
```

---

## 📂 Project Structure

```
voice-realtime-transcription/
│── backend/
│   ├── asgi.py         # Django Channels entrypoint
│   ├── settings.py
│   └── voice/          # Voice engine (speech.py, __init__.py)
│
│── frontend/
│   ├── index.html      # UI for recording + transcripts
│   └── app.js          # WebSocket logic
│
│── requirements.txt
│── README.md
```

---

## 🖼️ Demo Flow

1. Click **Start Recording**
2. Speak into your microphone
3. Watch the **transcripts appear in real-time**
4. Final results are stored in the transcripts panel

---

## 🔧 Tech Stack

- **Backend:** Django, Django Channels, WebSockets
- **Speech:** SpeechRecognition / Whisper (configurable)
- **Frontend:** Vanilla JS + WebSocket API

---

## 📌 Roadmap

- [ ] Add **speaker diarization** (who’s talking)
- [ ] Support **multiple languages**
- [ ] Add **real-time translation**
- [ ] Store transcripts in a database

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.

---

## 📜 License

MIT License © 2025 Ezika Chinweike

---
