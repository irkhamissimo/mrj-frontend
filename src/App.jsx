import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import MemorizationPage from "./pages/memorization/MemorizationPage";
import RevisionPage from "./pages/revision/RevisionPage";
import RevisionsListPage from "./pages/revision/RevisionsListPage";
import PrivateRoute from "./components/PrivateRoute";
import Layout from "./components/Layout";
import VaultPage from "./pages/vault/VaultPage";
import MurajaahPage from "./pages/murajaah/MurajaahPage";

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
              <Layout>
                <MemorizationPage />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/revisions" 
          element={
            <PrivateRoute>
              <Layout>
                <RevisionsListPage />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/revision/:entryId" 
          element={
            <PrivateRoute>
              <Layout>
                <RevisionPage />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/vault" 
          element={
            <PrivateRoute>
              <Layout>
                <VaultPage />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/murajaah" 
          element={
            <PrivateRoute>
              <Layout>
                <MurajaahPage />
              </Layout>
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App; 