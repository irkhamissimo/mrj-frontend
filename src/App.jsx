import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import MemorizationPage from "./pages/memorization/MemorizationPage";
import RevisionPage from "./pages/revision/RevisionPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/memorization" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/memorization" element={<MemorizationPage />} />
        <Route path="/revision/:entryId" element={<RevisionPage />} />
      </Routes>
    </Router>
  );
}

export default App; 