import { apiClient } from "../interceptor/interceptor.js";
import { API_BASE_URL } from "../constants/base.js";

// Auth functions
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
