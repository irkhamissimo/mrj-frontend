import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  
  if (!accessToken && !refreshToken) {
    // No tokens found, redirect to login
    return <Navigate to="/login" replace />;
  }

  return children;
} 