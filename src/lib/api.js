const API_URL = "http://localhost:5000/api";

async function refreshAccessToken() {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token found");
    }

    const response = await fetch(`${API_URL}/users/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return data.accessToken;
  } catch (error) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
    throw error;
  }
}

export async function apiCall(endpoint, options = {}) {
  const accessToken = localStorage.getItem("accessToken");
  
  // Add authorization header if token exists
  if (accessToken) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);

    // If unauthorized and we have a refresh token, try to refresh
    if (response.status === 401 && localStorage.getItem("refreshToken")) {
      try {
        const newAccessToken = await refreshAccessToken();
        
        // Retry the original request with new token
        const retryOptions = {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        };
        
        const retryResponse = await fetch(`${API_URL}${endpoint}`, retryOptions);
        return retryResponse;
      } catch (refreshError) {
        // If refresh fails, redirect to login
        window.location.href = "/login";
        throw new Error("Failed to refresh token");
      }
    }

    return response;
  } catch (error) {
    if (error.message.includes("Failed to refresh token")) {
      window.location.href = "/login";
    }
    throw error;
  }
} 