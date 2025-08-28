import { apiClient } from "../interceptor/interceptor.js";

// User functions
export async function getProfile() {
  try {
    const response = await apiClient.get("/user/get-profile/");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch profile");
  }
}

export async function updateProfile(profileData) {
  try {
    const response = await apiClient.put("/user/profile-update/", profileData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update profile"
    );
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await apiClient.post("/user/password-change/", {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to change password"
    );
  }
}
