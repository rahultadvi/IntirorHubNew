import "./App.css";
import type { ReactElement } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./Layout/main";
import Home from "./pages/Home";
import Payments from "./pages/Payments";
import BOQ from "./pages/BOQ";
import Expenses from "./pages/Expenses";
import Feed from "./pages/Feed";
import FeedDetail from "./pages/FeedDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Invite from "./pages/Invite";
import ManageSites from "./pages/ManageSites";
import UserListing from "./pages/UserListing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminSignup from "./pages/AdminSignup";
import Adminpanel from "./pages/Adminpanel";
import Profile from "./pages/Profile";
import Unauthorized from "./pages/Unauthorized";
import Landing from "./pages/Landing";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { SiteProvider } from "./context/SiteContext";
import ProtectedModuleRoute from "./routes/ProtectedModuleRoute";

// ---------------- ROUTE HELPERS ----------------

const PublicRoute = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth();
  if (token) return <Navigate to="/home" replace />;
  return children;
};

const RootRedirect = () => {
  const { token } = useAuth();
  if (token) return <Navigate to="/home" replace />;
  return <Landing />;
};

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }: { children: ReactElement }) => {
  const { token, user } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role?.toUpperCase() !== "ADMIN") {
    return <Navigate to="/home/unauthorized" replace />;
  }

  return children;
};

// ------------------------------------------------

function App() {
  return (
    <AuthProvider>
      <SiteProvider>
        <Router>
          <Routes>
            {/* Root */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            />
            <Route
              path="/admin-signup"
              element={
                <PublicRoute>
                  <AdminSignup />
                </PublicRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/*" element={<ResetPassword />} />

            {/* Main App */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={
                  <ProtectedModuleRoute module="home">
                    <Home />
                  </ProtectedModuleRoute>
                }
              />

              <Route
                path="payments"
                element={
                  <ProtectedModuleRoute module="payments">
                    <Payments />
                  </ProtectedModuleRoute>
                }
              />

              <Route
                path="boq"
                element={
                  <ProtectedModuleRoute module="boq">
                    <BOQ />
                  </ProtectedModuleRoute>
                }
              />

              <Route
                path="expenses"
                element={
                  <ProtectedModuleRoute module="expenses">
                    <Expenses />
                  </ProtectedModuleRoute>
                }
              />

              <Route
                path="feed"
                element={
                  <ProtectedModuleRoute module="feed">
                    <Feed />
                  </ProtectedModuleRoute>
                }
              />

              <Route
                path="feed/:id"
                element={
                  <ProtectedModuleRoute module="feed">
                    <FeedDetail />
                  </ProtectedModuleRoute>
                }
              />

              <Route
                path="invite"
                element={
                  <ProtectedModuleRoute module="invite">
                    <Invite />
                  </ProtectedModuleRoute>
                }
              />

              {/* Normally admin-only features, but still under /home */}
              <Route path="manage-sites" element={<ManageSites />} />
              <Route path="users" element={<UserListing />} />
              <Route path="profile" element={<Profile />} />

              {/* Unauthorized */}
              <Route path="unauthorized" element={<Unauthorized />} />
            </Route>

            {/* Admin Panel */}
            <Route
              path="/adminpanel"
              element={
                <AdminRoute>
                  <Adminpanel />
                </AdminRoute>
              }
            />

            {/* Catch All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SiteProvider>
    </AuthProvider>
  );
}

export default App;
