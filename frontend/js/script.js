let socket = null;
let audioCtx = null;
let processor = null;
let micStream = null;
let recording = false;
// adjust to your hearts contexts :)
let serverUrl = `ws://${location.hostname}:8000/ws/speech/`;

const logEl = document.getElementById("log");
const finalEl = document.getElementById("final");
const statusEl = document.getElementById("status");
const recordBtn = document.getElementById("recordBtn");
const connectBtn = document.getElementById("connectBtn");
const langSel = document.getElementById("lang");

function log(...args) {
  const msg = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");

  logEl.textContent += msg + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(text) {
  // set to either connected or disconnected
  statusEl.textContent = text;
}

connectBtn.onclick = () => connectWS();
langSel.onchange = () => {
  // if not connected to backend
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "lang", value: langSel.value }));
  }
};

async function connectWS() {
  // if not connected to backend
  if (socket && socket.readyState === WebSocket.OPEN) return;
  socket = new WebSocket(serverUrl);
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    setStatus("Connected");
    recordBtn.disabled = false;
    socket.send(JSON.stringify({ type: "lang", value: langSel.value }));
  };
  socket.onclose = () => {
    setStatus("Disconnected");
    recordBtn.disabled = true;
    stopRecording();
  };

  socket.onerror = (e) => log("WS error:", e);
  socket.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);

      switch (data.type) {
        case "ready":
          log("Server:", data.message);
          break;
        case "status":
          log("Status:", data.message);
          break;
        case "final":
          const tag = document.createElement("div");
          tag.className = "tag";
          tag.textContent = data.text || "(no speech)";
          finalEl.appendChild(tag);
          finalEl.scrollTop = finalEl.scrollHeight;
          break;
        default:
          break;
      }
    } catch (error) {
      // Silently ignore or show subtle error
      console.error("Failed to parse WebSocket message");
    }
  };
}

recordBtn.onclick = async () => {
  if (!recording) {
    await startRecording();
  } else {
    stopRecording();
  }
};

async function startRecording() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    await connectWS();
  }

  audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 48000,
  });
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioCtx.createMediaStreamSource(micStream);

  const bufferLen = 4096;
  processor = audioCtx.createScriptProcessor(bufferLen, 1, 1);
  source.connect(processor);
  processor.connect(audioCtx.destination);

  const targetRate = 16000;
  processor.onaudioprocess = (e) => {
    if (!recording) return;

    const input = e.inputBuffer.getChannelData(0); // Float32 48k
    const int16 = downsampleTo16kInt16(input, audioCtx.sampleRate, targetRate);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(int16.buffer); // binary PCM16
    }
  };

  recording = true;
  recordBtn.textContent = "Stop Recording";
  setStatus("Recording...");
  log("Recording started");
}

function stopRecording() {
  recording = false;
  recordBtn.textContent = "Start Recording";
  setStatus(
    socket && socket.readyState === WebSocket.OPEN
      ? "Connected"
      : "Disconnected"
  );
  if (processor) {
    processor.disconnect();
    processor.onaudioprocess = null;
    processor = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
  log("Recording stopped");
}

function downsampleTo16kInt16(float32Data, inputRate, targetRate) {
  if (targetRate === inputRate) {
    // Convert float32 -> int16
    const out = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Data[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  const ratio = inputRate / targetRate;
  const newLen = Math.floor(float32Data.length / ratio);
  const out = new Int16Array(newLen);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < newLen) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    // simple averaging
    let accum = 0;
    count = 0;
    for (
      let i = offsetBuffer;
      i < nextOffsetBuffer && i < float32Data.length;
      i++
    ) {
      accum += float32Data[i];
      count++;
    }

    let s = accum / count;
    s = Math.max(-1, Math.min(1, s));
    out[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return out;
}
