import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import MemorizationPage from "./pages/memorization/MemorizationPage";
import RevisionPage from "./pages/revision/RevisionPage";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Navigate to="/memorization" />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/memorization" 
          element={
            <PrivateRoute>
              <MemorizationPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/revision/:entryId" 
          element={
            <PrivateRoute>
              <RevisionPage />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App; 