import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RevisionPage from "./pages/revision/RevisionPage";
import RevisionsListPage from "./pages/revision/RevisionsListPage";
import PrivateRoute from "./components/PrivateRoute";
import Layout from "./components/Layout";
import VaultPage from "./pages/vault/VaultPage";
import MurajaahPage from "./pages/murajaah/MurajaahPage";
import MurajaahPlayer from "./pages/murajaah/MurajaahPlayer";
import ZiyadahPage from "./pages/ziyadah/ZiyadahPage";
import ProductivityStats from "./pages/stats/ProductivityStats";
import RegisterPage from "./pages/auth/RegisterPage";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Navigate to="/ziyadah" />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/ziyadah" 
          element={
            <PrivateRoute>
              <Layout>
                <ZiyadahPage/>
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
        <Route 
          path="/murajaah/:type/:identifier" 
          element={
            <PrivateRoute>
              <Layout>
                <MurajaahPlayer />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route
          path="/stats"
          element={
            <PrivateRoute>
              <Layout>
                <ProductivityStats /> 
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App; 