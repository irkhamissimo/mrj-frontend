import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import MemorizationPage from "./pages/memorization/MemorizationPage";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/memorization" element={<MemorizationPage />} />
        {/* Add more routes here */}
      </Routes>
    </Router>
  );
}

export default App; 