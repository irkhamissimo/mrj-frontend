import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall, clearAuth } from "@/lib/api";

/**
 * LogoutButton component
 * Updated to use the same styling as the menu links so it appears even with them.
 */
export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      await apiCall("/users/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center rounded-md bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
    >
      Logout
    </button>
  );
}
