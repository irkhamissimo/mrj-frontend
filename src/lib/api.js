import { API_BASE_URL } from '@/config';

let refreshPromise = null;

export const clearAuth = () => {
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export const getAccessToken = () => {
  const token = sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
  if (token && localStorage.getItem("accessToken")) {
    sessionStorage.setItem("accessToken", token);
    localStorage.removeItem("accessToken");
  }
  return token;
};

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token found");
    }

    const response = await fetch(`${API_BASE_URL}/users/refresh-token`, {
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
    sessionStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return data.accessToken;
  } catch (error) {
    clearAuth();
    window.location.href = "/login";
    throw error;
  } finally {
    refreshPromise = null;
  }
  })();

  return refreshPromise;
}

export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      // Add any default headers here
    },
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const accessToken = getAccessToken();
  
  // Add authorization header if token exists
  if (accessToken) {
    finalOptions.headers = {
      ...finalOptions.headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  try {
    const response = await fetch(url, finalOptions);

    // If unauthorized and we have a refresh token, try to refresh
    if (response.status === 401 && localStorage.getItem("refreshToken")) {
      try {
        const newAccessToken = await refreshAccessToken();
        
        // Retry the original request with new token
        const retryOptions = {
          ...finalOptions,
          headers: {
            ...finalOptions.headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        };
        
        const retryResponse = await fetch(url, retryOptions);
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
};

export async function responseError(response, fallback = "Request failed") {
  try {
    const data = await response.clone().json();
    return data.error || data.message || fallback;
  } catch (_) {
    return fallback;
  }
}
