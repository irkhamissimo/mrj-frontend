import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from "@/lib/api";

/**
 * LogoutButton component
 * Updated to use the same styling as the menu links so it appears even with them.
 */
export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiCall("/logout", { method: "POST" });
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
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