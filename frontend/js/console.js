import { apiClient } from "../api/interceptor/interceptor.js";
import { logoutUser } from "../api/handlers/auth.js";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "../api/handlers/user.js";

function initProfileWS() {
  const token = localStorage.getItem("alpha_token");
  if (!token) return;

  const wsUrl = `ws://${
    location.hostname
  }:8000/ws/profile/?token=${encodeURIComponent(token)}`;
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    if (data.type === "profile_update") {
      localStorage.setItem("alpha_user", JSON.stringify(data.user));
      displayUsername();
      showNotification("Profile updated", "success");
    }
  };

  // error handling
  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = (event) => {
    console.log("WebSocket closed:", event.code, event.reason);
  };
}

// Initialize all toggle switches
function initToggleSwitches() {
  // Main toggle
  const mainToggle = document.getElementById("mainToggle");
  if (mainToggle) {
    // Load saved state from localStorage and server
    const savedState = localStorage.getItem("mainToggle");
    if (savedState !== null) {
      mainToggle.checked = savedState === "true";
    }

    // Get current state from server
    fetchDeviceState("main").then((state) => {
      if (state !== null) {
        mainToggle.checked = state;
        localStorage.setItem("mainToggle", state);
      }
    });

    mainToggle.addEventListener("change", function () {
      console.log("Main power:", this.checked ? "ON" : "OFF");
      // Save state to localStorage
      localStorage.setItem("mainToggle", this.checked);

      // Send command to server
      controlDevice("main", this.checked);

      // Show visual feedback
      showDeviceFeedback("main", this.checked, "manual");
    });
  }

  // Device toggles
  const deviceToggles = document.querySelectorAll(".device-toggle");
  deviceToggles.forEach((toggle) => {
    const device = toggle.dataset.device;

    // Load saved states
    const savedState = localStorage.getItem(`${device}Toggle`);
    if (savedState !== null) {
      toggle.checked = savedState === "true";
    }

    // Get current state from server
    fetchDeviceState(device).then((state) => {
      if (state !== null) {
        toggle.checked = state;
        localStorage.setItem(`${device}Toggle`, state);
      }
    });

    toggle.addEventListener("change", function () {
      const device = this.dataset.device;
      console.log(`${device} power:`, this.checked ? "ON" : "OFF");

      // Save state to localStorage
      localStorage.setItem(`${device}Toggle`, this.checked);

      // Send command to server
      controlDevice(device, this.checked);

      // Show visual feedback
      showDeviceFeedback(device, this.checked, "manual");
    });
  });
}

// Control device via HTTP API using axios
async function controlDevice(device, state) {
  try {
    const response = await apiClient.post(`/device/${device}/control/`, {
      state: state,
    });

    console.log(`Device ${device} control successful:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error controlling device ${device}:`, error);
    // Revert toggle state on error
    const toggle =
      device === "main"
        ? document.getElementById("mainToggle")
        : document.querySelector(`.device-toggle[data-device="${device}"]`);
    if (toggle) toggle.checked = !state;

    showNotification(`Failed to control ${device}`, "error");
    throw error;
  }
}

// Fetch device state from server
async function fetchDeviceState(device) {
  try {
    const response = await apiClient.get(`/device/${device}/state/`);
    return response.data.state;
  } catch (error) {
    console.error(`Error fetching device ${device} state:`, error);
    return null;
  }
}

// Show visual feedback for device control
function showDeviceFeedback(device, state, source) {
  const deviceNames = {
    main: "Main Power",
    lamp: "Lamp",
    fan: "Fan",
    ac: "AC",
  };

  const sourceText = source === "voice" ? "via voice command" : "manually";
  const message = `${deviceNames[device]} turned ${
    state ? "ON" : "OFF"
  } ${sourceText}`;

  showNotification(message, "success");

  // Visual indicator (pulse animation)
  const toggle =
    device === "main"
      ? document.getElementById("mainToggle")
      : document.querySelector(`.device-toggle[data-device="${device}"]`);

  if (toggle) {
    toggle.parentElement.classList.add("pulse");
    setTimeout(() => {
      toggle.parentElement.classList.remove("pulse");
    }, 1000);
  }
}

// Show notification
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${
        type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
      }"></i>
      <span>${message}</span>
    </div>
  `;

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Remove after delay
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Handle WebSocket device updates
function handleDeviceUpdate(data) {
  const { device, state, source } = data;

  // Update the appropriate toggle
  let toggle;
  if (device === "main") {
    toggle = document.getElementById("mainToggle");
  } else {
    toggle = document.querySelector(`.device-toggle[data-device="${device}"]`);
  }

  if (toggle && toggle.checked !== state) {
    toggle.checked = state;
    localStorage.setItem(`${device}Toggle`, state);

    // Show feedback if the change came from another source
    if (source === "voice" || source === "http") {
      showDeviceFeedback(device, state, source);
    }
  }
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
    // Add more commands as needed :)
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
    // Add more commands as needed :)
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
  const userSettingsForm = document.getElementById("userSettingsForm");

  if (settingsBtn && modal) {
    settingsBtn.addEventListener("click", async () => {
      modal.style.display = "block";
      // Load user data when modal opens
      await loadUserData();
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (userSettingsForm) {
    userSettingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveUserSettings();
    });
  }

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

// Save user settings
async function saveUserSettings() {
  try {
    const saveButton = document.querySelector(".save-settings");
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    // Get profile data
    const profileData = {
      username: document.getElementById("usernameInput").value,
      email: document.getElementById("emailInput").value,
      bio: document.getElementById("bioInput").value,
      theme: document.getElementById("themeSelect").value,
      language: document.getElementById("languageSelect").value,
      preferredInputMode: document.getElementById("inputModeSelect").value,
      timezone: document.getElementById("timezoneSelect").value,
      accessibilitySettings: {
        ttsEnabled: document.getElementById("ttsEnabled").checked,
        sttEnabled: document.getElementById("sttEnabled").checked,
      },
    };

    // Update profile
    await updateProfile(profileData);

    // Handle password change if provided
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("All password fields are required to change password");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match");
      }

      await changePassword(currentPassword, newPassword);
    }

    // Update UI with new username
    displayUsername();

    showNotification("Settings saved successfully", "success");
    document.getElementById("settingsModal").style.display = "none";
  } catch (error) {
    console.error("Failed to save settings:", error);
    showNotification(error.message || "Failed to save settings", "error");
  } finally {
    const saveButton = document.querySelector(".save-settings");
    saveButton.disabled = false;
    saveButton.textContent = "Save Settings";
  }
}

// Load user data into form
async function loadUserData() {
  try {
    const response = await getProfile();
    const userData = response.user;

    // Populate form fields
    document.getElementById("usernameInput").value = userData.username || "";
    document.getElementById("emailInput").value = userData.email || "";
    document.getElementById("bioInput").value = userData.bio || "";
    document.getElementById("themeSelect").value = userData.theme || "light";
    document.getElementById("languageSelect").value = userData.language || "en";
    document.getElementById("inputModeSelect").value =
      userData.preferredInputMode || "text";
    document.getElementById("timezoneSelect").value =
      userData.timezone || "UTC";

    // Set accessibility settings
    if (userData.accessibilitySettings) {
      document.getElementById("ttsEnabled").checked =
        userData.accessibilitySettings.ttsEnabled || false;
      document.getElementById("sttEnabled").checked =
        userData.accessibilitySettings.sttEnabled || false;
    }

    // Clear password fields
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
  } catch (error) {
    console.error("Failed to load user data:", error);
    showNotification("Failed to load user settings", "error");
  }
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
          window.location.href = "./auth.html";
        } catch (error) {
          console.error("Logout error:", error);
          // Force logout even if API call fails
          localStorage.removeItem("alpha_token");
          localStorage.removeItem("user");
          window.location.href = "./auth.html";
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

  // Profile update Listener
  initProfileWS();

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

    // Get JWT token
    const token = localStorage.getItem("alpha_token");
    if (!token) {
      setStatus("Authentication required");
      return;
    }

    // Add token to WebSocket URL
    const wsUrl = `${serverUrl}?token=${encodeURIComponent(token)}`;
    socket = new WebSocket(wsUrl);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      setStatus("Connected");
      recordBtn.disabled = false;
      socket.send(JSON.stringify({ type: "lang", value: langSel.value }));
    };

    socket.onclose = (event) => {
      setStatus("Disconnected");
      recordBtn.disabled = true;
      stopRecording();

      // Handle authentication failure
      if (event.code === 4001) {
        showNotification("Authentication failed. Please login again.", "error");
        setTimeout(() => {
          window.location.href = "../auth.html";
        }, 2000);
      }
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

          case "device_update":
            handleDeviceUpdate(data);
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
