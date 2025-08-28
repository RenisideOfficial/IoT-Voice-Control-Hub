import axios from "https://cdn.jsdelivr.net/npm/axios@1.6.7/dist/esm/axios.min.js";

// Base URL for Django API
const API_BASE_URL = "http://localhost:8000/api";

// axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token (alpha_token)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("alpha_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("alpha_token");
      localStorage.removeItem("user");
      alert("Session expired. Please login again.");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

// --- Exported functions ---

export async function registerUser(username, email, password) {
  try {
    const response = await apiClient.post("/auth/register/", {
      username,
      email,
      password,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Registration failed");
  }
}

export async function loginUser(username_or_email, password) {
  try {
    const response = await apiClient.post("/auth/login/", {
      username_or_email,
      password,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
}

export async function logoutUser() {
  try {
    const response = await apiClient.post("/auth/logout/");
    localStorage.removeItem("alpha_token");
    window.location.href = "./auth.html";
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Logout failed");
  }
}

export async function getProfile() {
  try {
    const response = await apiClient.get("/auth/profile/");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch profile");
  }
}

// Google OAuth functions
export function initiateGoogleOAuth() {
  // Redirect to Django's Google OAuth endpoint
  window.location.href = `${API_BASE_URL}/auth/google/`;
}

export async function mobileGoogleLogin(idToken) {
  try {
    const response = await apiClient.post("/auth/google/mobile/", {
      id_token: idToken,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Google login failed");
  }
}
