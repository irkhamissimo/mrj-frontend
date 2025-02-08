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
    <div className="min-h-screen bg-background">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex space-x-8">
              {menuItems.map((item) => (
                <Link
                  key={item._id}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    location.pathname === item.path
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          
            
            <div className="flex space-x-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="p-8">
        {children}
      </main>
    </div>
  );
} 