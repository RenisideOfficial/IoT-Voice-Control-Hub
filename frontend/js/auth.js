import {
  registerUser,
  loginUser,
  initiateGoogleOAuth,
} from "../api/handlers/auth.js";
import { getProfile } from "../api/handlers/user.js";

// Toggle between login and register forms
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const formTitle = document.getElementById("formTitle");
const toggleText = document.getElementById("toggleText");
const toggleLink = document.getElementById("toggleLink");
const googleButtons = document.querySelectorAll(".google-btn");

// Form toggle functionality
toggleLink.addEventListener("click", function toggleForms() {
  if (loginForm.classList.contains("hidden")) {
    // Switch to login
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    formTitle.textContent = "Login to Your Account";
    toggleText.innerHTML =
      'Don\'t have an account? <span id="toggleLink">Sign up</span>';
    document
      .getElementById("toggleLink")
      .addEventListener("click", toggleForms);
  } else {
    // Switch to register
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    formTitle.textContent = "Create an Account";
    toggleText.innerHTML =
      'Already have an account? <span id="toggleLink">Sign in</span>';
    document
      .getElementById("toggleLink")
      .addEventListener("click", toggleForms);
  }
});

// Helper to display form errors
function showFormError(form, message) {
  // Remove any existing error messages
  const existingError = form.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }

  // Create and display new error message
  const errorElement = document.createElement("div");
  errorElement.className = "error-message";
  errorElement.style.color = "#ff6b6b";
  errorElement.style.marginTop = "10px";
  errorElement.style.padding = "10px";
  errorElement.style.backgroundColor = "rgba(255, 107, 107, 0.1)";
  errorElement.style.borderRadius = "5px";
  errorElement.style.border = "1px solid #ff6b6b";
  errorElement.textContent = message;

  form.appendChild(errorElement);

  // Auto-remove error after 5 seconds
  setTimeout(() => {
    if (errorElement.parentNode) {
      errorElement.remove();
    }
  }, 5000);
}

// Helper to show loading state
function setLoadingState(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  } else {
    button.disabled = false;
    button.innerHTML =
      button === loginForm.querySelector('button[type="submit"]')
        ? "Login"
        : "Create Account";
  }
}

// Password validation
function validatePassword(password) {
  if (password.length < 6) {
    return "Password must be at least 6 characters long";
  }
  return null;
}

// Email validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

// --- REGISTER FORM ---
registerForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const usernameInput = registerForm.querySelector(
    'input[placeholder="Username"]'
  );
  const emailInput = registerForm.querySelector('input[type="email"]');
  const passwordInput = registerForm.querySelector(
    'input[placeholder="Password"]'
  );
  const confirmPasswordInput = registerForm.querySelector(
    'input[placeholder="Confirm Password"]'
  );

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  // Clear previous errors
  showFormError(registerForm, "");

  // Validation
  if (!username || !email || !password || !confirmPassword) {
    return showFormError(registerForm, "All fields are required");
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return showFormError(registerForm, emailError);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return showFormError(registerForm, passwordError);
  }

  if (password !== confirmPassword) {
    return showFormError(registerForm, "Passwords do not match");
  }

  const submitButton = registerForm.querySelector('button[type="submit"]');
  setLoadingState(submitButton, true);

  try {
    const data = await registerUser(username, email, password);

    if (data.status === "success") {
      localStorage.setItem("token", data.access);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Show success message
      alert(`Registration successful! Welcome ${data.user.username}`);

      // Redirect to dashboard
      window.location.href = "./console.html";
    } else {
      throw new Error(data.message || "Registration failed");
    }
  } catch (err) {
    console.log("Registration Failed: ", err.message);
    showFormError(
      registerForm,
      "Internal Server Error Occurred!, try again later"
    );
  } finally {
    setLoadingState(submitButton, false);
  }
});

// --- LOGIN FORM ---
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const usernameInput = loginForm.querySelector('input[type="text"]');
  const passwordInput = loginForm.querySelector('input[type="password"]');

  const username_or_email = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Clear previous errors
  showFormError(loginForm, "");

  // Validation
  if (!username_or_email || !password) {
    return showFormError(loginForm, "Username/Email and password are required");
  }

  const submitButton = loginForm.querySelector('button[type="submit"]');
  setLoadingState(submitButton, true);

  try {
    const data = await loginUser(username_or_email, password);

    if (data.status === "success") {
      localStorage.setItem("token", data.access);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Show success message
      alert(`Login successful! Welcome ${data.user.username}`);

      // Redirect to dashboard
      window.location.href = "./console.html";
    } else {
      throw new Error(data.message || "Login failed");
    }
  } catch (err) {
    console.log("Login Failed: ", err.message);
    showFormError(loginForm, "Internal Server Error Occured!, try again later");
  } finally {
    setLoadingState(submitButton, false);
  }
});

// --- GOOGLE OAUTH ---
googleButtons.forEach((button) => {
  button.addEventListener("click", function () {
    initiateGoogleOAuth();
  });
});

// Check if we're returning from OAuth with a token
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (token) {
    localStorage.setItem("token", token);

    // Fetch user profile to get complete user data
    async function fetchUserProfile() {
      try {
        // endpoint url
        const response = await getProfile("/auth/profile");

        if (response.ok) {
          const userData = await response.json();
          localStorage.setItem("user", JSON.stringify(userData));
          window.location.href = "./console.html";
        } else {
          throw new Error("Failed to fetch user profile");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        alert(
          "Authentication completed but failed to load user data. Please try logging in again."
        );
      }
    }

    fetchUserProfile();
  }
});
