import { logoutUser } from "../interceptor/interceptor.js";

// Initialize all toggle switches
function initToggleSwitches() {
  // Main toggle
  const mainToggle = document.getElementById("mainToggle");
  if (mainToggle) {
    // Load saved state from localStorage
    const savedState = localStorage.getItem("mainToggle");
    if (savedState !== null) {
      mainToggle.checked = savedState === "true";
    }

    mainToggle.addEventListener("change", function () {
      console.log("Main power:", this.checked ? "ON" : "OFF");
      // Save state to localStorage
      localStorage.setItem("mainToggle", this.checked);

      // TODO: API requests to control devices
    });
  }

  // Device toggles
  const deviceToggles = document.querySelectorAll(".device-toggle");
  deviceToggles.forEach((toggle) => {
    // Load saved states
    const device = toggle.dataset.device;
    const savedState = localStorage.getItem(`${device}Toggle`);
    if (savedState !== null) {
      toggle.checked = savedState === "true";
    }

    toggle.addEventListener("change", function () {
      const device = this.dataset.device;
      console.log(`${device} power:`, this.checked ? "ON" : "OFF");

      // Save state to localStorage
      localStorage.setItem(`${device}Toggle`, this.checked);

      // TODO: API request to control the specific deviceS
    });
  });
}

const commandMap = {
  on: [
    "main on",
    "turn on main",
    "switch main on",
    "activate main",
    "enable main",
    "power on main",
    "lights on",
    "light on",
    "turn on lights",
    "switch on the lights",
    "switch on light",
    "turn lights on",
    "turn light on",
    "turn on switch",
  ],
  off: [
    "main off",
    "turn off main",
    "switch main off",
    "deactivate main",
    "disable main",
    "power off main",
    "lights off",
    "light off",
    "turn off lights",
    "switch off the lights",
    "switch off light",
    "turn lights off",
    "turn light off",
    "turn off switch",
  ],
};

// check if a command is in the list
function matchesCommand(cmd, commandList) {
  return commandList.some((keyword) => cmd.toLowerCase().includes(keyword));
}

function handleVoiceCommand(cmd) {
  const mainToggle = document.getElementById("mainToggle");
  const deviceToggles = document.querySelectorAll(".device-toggle");

  // Main power control
  if (matchesCommand(cmd, commandMap.on) && mainToggle) {
    mainToggle.checked = true;
    mainToggle.dispatchEvent(new Event("change"));
  }

  if (matchesCommand(cmd, commandMap.off) && mainToggle) {
    mainToggle.checked = false;
    mainToggle.dispatchEvent(new Event("change"));
  }

  // Device-specific control
  deviceToggles.forEach((toggle) => {
    const device = toggle.dataset.device;
    if (cmd.includes(`${device} on`)) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change"));
    }
    if (cmd.includes(`${device} off`)) {
      toggle.checked = false;
      toggle.dispatchEvent(new Event("change"));
    }
  });

  // General turn on/off all
  if (matchesCommand(cmd, commandMap.on)) {
    if (mainToggle) mainToggle.checked = true;
    deviceToggles.forEach((toggle) => (toggle.checked = true));
  }
  if (matchesCommand(cmd, commandMap.off)) {
    if (mainToggle) mainToggle.checked = false;
    deviceToggles.forEach((toggle) => (toggle.checked = false));
  }
}

/* ---------- User Profile Management ---------- */

// Display username in UI
function displayUsername() {
  const userData = JSON.parse(localStorage.getItem("alpha_user") || "{}");
  const username = userData.username || "User";

  // Update all username elements
  document
    .querySelectorAll(
      ".username, #mainUsername, #lampUsername, #fanUsername, #acUsername"
    )
    .forEach((el) => {
      el.textContent = username.split(" ")[0];
    });

  // Update sidebar username with truncation for long names
  const sidebarUsername = document.getElementById("sidebarUsername");
  if (sidebarUsername) {
    sidebarUsername.textContent =
      username.length > 15 ? username.substring(0, 15) + "..." : username;
    sidebarUsername.title = username; // Show full name on hover
  }
}

// Settings modal functionality
function initSettingsModal() {
  const settingsBtn = document.querySelector(".settings-btn");
  const modal = document.getElementById("settingsModal");
  const closeBtn = document.querySelector(".close-modal");
  const saveBtn = document.querySelector(".save-settings");

  if (settingsBtn && modal) {
    settingsBtn.addEventListener("click", () => {
      modal.style.display = "block";
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      // Save settings logic here
      alert("Settings saved!");
      modal.style.display = "none";
    });
  }

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

// Logout functionality
function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to logout?")) {
        try {
          await logoutUser();
          localStorage.removeItem("alpha_token");
          localStorage.removeItem("user");
          window.location.href = "../auth.html";
        } catch (error) {
          console.error("Logout error:", error);
          // Force logout even if API call fails
          localStorage.removeItem("alpha_token");
          localStorage.removeItem("user");
          window.location.href = "../auth.html";
        }
      }
    });
  }
}

// Check authentication status
function checkAuth() {
  const token = localStorage.getItem("alpha_token");
  if (!token) {
    window.location.href = "../auth.html";
    return false;
  }
  return true;
}

document.addEventListener("DOMContentLoaded", function () {
  // Check authentication first
  if (!checkAuth()) return;

  // Display username
  displayUsername();

  // Initialize user features
  initSettingsModal();
  initLogout();
  initToggleSwitches();

  const sidebarItems = document.querySelectorAll(".sidebar-upper li");
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
            handleVoiceCommand(cmd);
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
      const int16 = downsampleTo16kInt16(
        input,
        audioCtx.sampleRate,
        targetRate
      );
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
});
