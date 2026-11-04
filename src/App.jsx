import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import Layout from "./components/Layout";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const RevisionPage = lazy(() => import("./pages/revision/RevisionPage"));
const RevisionsListPage = lazy(() => import("./pages/revision/RevisionsListPage"));
const VaultPage = lazy(() => import("./pages/vault/VaultPage"));
const MurajaahPage = lazy(() => import("./pages/murajaah/MurajaahPage"));
const MurajaahPlayer = lazy(() => import("./pages/murajaah/MurajaahPlayer"));
const ZiyadahPage = lazy(() => import("./pages/ziyadah/ZiyadahPage"));
const ProductivityStats = lazy(() => import("./pages/stats/ProductivityStats"));
const LeaderboardPage = lazy(() => import("./pages/gamification/LeaderboardPage"));
function App() {
  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
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
        <Route
          path="/leaderboard"
          element={
            <PrivateRoute>
              <Layout>
                <LeaderboardPage />
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
