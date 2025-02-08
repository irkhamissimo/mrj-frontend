import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiCall } from "@/lib/api";
import LogoutButton from "./LogoutButton";

export default function Layout({ children }) {
  const location = useLocation();
  const [menuItems, setMenuItems] = useState([]);

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

  return (
    <div className="min-h-screen bg-background relative pt-16 pb-24">
      {/* Top header with title and logout button */}
      <header className="fixed top-0 inset-x-0 bg-white shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="text-lg font-semibold">
            Mindful Hafidz
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main content area */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Bottom dock (MacOS-style) for menu items */}
      <nav className="fixed bottom-4 inset-x-0 z-20 flex justify-center">
        <div className="bg-gray-100/80 backdrop-blur-lg rounded-full px-6 py-3 shadow-2xl border border-gray-200 flex space-x-6">
          {menuItems.map((item) => (
            <Link
              key={item._id}
              to={item.path}
              className={`flex flex-col items-center justify-center text-sm font-medium transition-transform transform hover:scale-110 ${
                location.pathname === item.path ? "text-primary" : "text-gray-600"
              }`}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
} 