import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiCall } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import LogoutButton from "./LogoutButton";

const compactMenuLabels = {
  '/vault': 'Setoran',
  '/leaderboard': 'Peringkat',
};

export default function Layout({ children }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [menuItems, setMenuItems] = useState([]);
  const [gamification, setGamification] = useState(null);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await apiCall("/menu", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setMenuItems(data);
      } catch (error) {
        console.error("Failed to fetch menu items:", error);
      }
    };

    fetchMenuItems();
  }, []);

  useEffect(() => {
    const fetchGamification = async () => {
      try {
        const response = await apiCall("/gamification/me");
        const data = await response.json();
        if (response.ok) {
          setGamification(data);
        }
      } catch (error) {
        console.error("Failed to fetch gamification stats:", error);
      }
    };

    fetchGamification();
  }, []);

  return (
    <div className="min-h-screen relative pt-8 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      {/* Top header with title and logout button */}
      <header className="fixed top-0 inset-x-0 bg-white dark:bg-gray-900 shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="text-lg font-semibold">
            Mindful Hafidz
          </div>
          <div className="flex items-center gap-3">
            {gamification && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span title={`${gamification.streak}-day streak`}>🔥 {gamification.streak}</span>
                <span>·</span>
                <span title="Total points">⭐ {gamification.totalPoints}</span>
                <span>·</span>
                <span title={`Level ${gamification.level + 1}`}>🏅 {gamification.title}</span>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="max-w-2xl mx-auto px-4 pt-8 pb-3">
        {children}
      </main>

      {/* Compact dock with clearance for mobile home indicators. */}
      <nav aria-label="Navigasi utama" className="fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom))] inset-x-0 z-20 flex justify-center px-2 sm:px-3">
        <div className="flex w-full max-w-md items-center gap-0.5 rounded-2xl border border-gray-200 bg-gray-100/95 p-1 shadow-lg backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/95">
          {menuItems.map((item) => (
            <Link
              key={item._id}
              to={item.path}
              title={item.title}
              aria-label={item.title}
              aria-current={location.pathname === item.path ? 'page' : undefined}
              className={`flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2 sm:text-sm ${
                location.pathname === item.path ? "bg-white text-gray-950 shadow-sm dark:bg-gray-700 dark:text-white" : "text-gray-600 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-gray-700/60"
              }`}
            >
              <span className="truncate sm:hidden">{compactMenuLabels[item.path] || item.title}</span>
              <span className="hidden truncate sm:inline">{item.title}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
