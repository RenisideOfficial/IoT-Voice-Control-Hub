/* ---------- Sidebar + Hamburger + Toggles ---------- */
// Grab elements for sidebar navigation, sections, main toggle, and hamburger
const sidebarItems = document.querySelectorAll(".sidebar li");
const sections = document.querySelectorAll(".section");
const mainToggle = document.getElementById("mainToggle");
const hamburger = document.getElementById("hamburger");
const sidebar = document.querySelector(".sidebar");

// Sidebar navigation logic
sidebarItems.forEach((item) => {
  item.addEventListener("click", () => {
    // Highlight selected item
    sidebarItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");

    // Show the corresponding section
    sections.forEach((sec) => sec.classList.remove("active"));
    document.getElementById(item.dataset.section).classList.add("active");

    // Auto-close sidebar on mobile
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("active");
      hamburger.textContent = "☰";
    }
  });
});

// Manual toggle buttons
document.querySelectorAll(".toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.textContent = btn.textContent === "OFF" ? "ON" : "OFF";
  });
});

// Main toggle logic
mainToggle.addEventListener("click", () => {
  mainToggle.textContent = mainToggle.textContent === "OFF" ? "ON" : "OFF";
});

// Hamburger toggle for mobile
hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("active");
  hamburger.textContent = sidebar.classList.contains("active") ? "✕" : "☰";
});

/* ---------- WebSocket Voice Recognition ---------- */
let socket = null,
  audioCtx = null,
  processor = null,
  micStream = null,
  recording = false;
let serverUrl = `ws://${location.hostname}:8000/ws/speech/`;

// Grab UI elements
const logEl = document.getElementById("log");
const finalEl = document.getElementById("final");
const statusEl = document.getElementById("status");
const recordBtn = document.getElementById("recordBtn");
const connectBtn = document.getElementById("connectBtn");
const langSel = document.getElementById("lang");

// Logging helper
function log(...args) {
  const msg = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
  logEl.textContent += msg + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

// Update status text
function setStatus(text) {
  statusEl.textContent = text;
}

/* Connect WebSocket and handle messages */
connectBtn.onclick = () => connectWS();
langSel.onchange = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "lang", value: langSel.value }));
  }
};

async function connectWS() {
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
        case "final":
          // Display recognized speech
          const tag = document.createElement("div");
          tag.className = "tag";
          tag.textContent = data.text;
          finalEl.appendChild(tag);
          finalEl.scrollTop = finalEl.scrollHeight;

          // Voice command control
          const cmd = (data.text || "").toLowerCase();
          if (cmd.includes("main on")) mainToggle.textContent = "ON";
          if (cmd.includes("main off")) mainToggle.textContent = "OFF";
          document.querySelectorAll(".toggle-btn").forEach((btn) => {
            if (cmd.includes("turn on")) btn.textContent = "ON";
            if (cmd.includes("turn off")) btn.textContent = "OFF";
          });
          break;

        case "status":
          log("Status:", data.message);
          break;

        default:
          break;
      }
    } catch (e) {
      console.error("Invalid WS message");
    }
  };
}

/* ---------- Recording functions ---------- */
recordBtn.onclick = async () => {
  if (!recording) await startRecording();
  else stopRecording();
};

async function startRecording() {
  if (!socket || socket.readyState !== WebSocket.OPEN) await connectWS();

  audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 48000,
  });
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioCtx.createMediaStreamSource(micStream);

  processor = audioCtx.createScriptProcessor(4096, 1, 1);
  source.connect(processor);
  processor.connect(audioCtx.destination);

  const targetRate = 16000;
  processor.onaudioprocess = (e) => {
    if (!recording) return;
    const input = e.inputBuffer.getChannelData(0);
    const int16 = downsampleTo16kInt16(input, audioCtx.sampleRate, targetRate);
    if (socket && socket.readyState === WebSocket.OPEN)
      socket.send(int16.buffer);
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

/* ---------- Helper: Downsample 48kHz float32 -> 16kHz int16 ---------- */
function downsampleTo16kInt16(float32Data, inputRate, targetRate) {
  if (targetRate === inputRate) {
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
  let offsetResult = 0,
    offsetBuffer = 0;

  while (offsetResult < newLen) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0,
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
