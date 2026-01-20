import "./App.css";
import type { ReactElement } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./Layout/main";
import Home from "./pages/Home";
import Payments from "./pages/Payments";
import BOQ from "./pages/BOQ";
import Expenses from "./pages/Expenses";
import Feed from "./pages/Feed";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Invite from "./pages/Invite";
import ManageSites from "./pages/ManageSites";
import FeedDetail from "./pages/FeedDetail";
import UserListing from "./pages/UserListing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminSignup from "./pages/AdminSignup";
import Adminpanel from "./pages/Adminpanel";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { SiteProvider } from "./context/SiteContext";
import Profile from "./pages/Profile";

import ProtectedModuleRoute from "./routes/ProtectedModuleRoute";
import Unauthorized from "./pages/Unauthorized";


// ---------------- ROUTE HELPERS ----------------

const PublicRoute = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth();
  if (token) return <Navigate to="/home" replace />;
  return children;
};

const RootRedirect = () => {
  const { token } = useAuth();

  // Removed loading screen

  if (token) {
    return <Navigate to="/home" replace />;
  }

  // Redirect to static HTML landing page
  window.location.href = '/landing.html';
  return null;
};

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }: { children: ReactElement }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role?.toUpperCase() !== "ADMIN") return <Navigate to="/" replace />;
  return children;
};

// ------------------------------------------------

function App() {
  const ResetPasswordCatch: React.FC = () => {
    if (location.pathname && location.pathname.startsWith("/reset-password")) {
      return <ResetPassword />;
    }
    return <Navigate to="/" replace />;
  };

  return (
    <AuthProvider>
      <SiteProvider>
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/" element={<RootRedirect />} />

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

            {/* Main App with Layout */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="payments" element={<Payments />} />
              <Route path="boq" element={<BOQ />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="feed" element={<Feed />} />
              <Route path="feed/:id" element={<FeedDetail />} />
              <Route path="manage-sites" element={<ManageSites />} />
              <Route path="users" element={<UserListing />} />
                <Route path="profile" element={<Profile />} />
              <Route
                path="invite"
                element={
                  <ProtectedModuleRoute module="invite">
                    <Invite />
                  </ProtectedModuleRoute>
                }
              />

              {/* Unauthorized page inside layout */}
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
            <Route path="*" element={<ResetPasswordCatch />} />
          </Routes>
        </Router>
      </SiteProvider>
    </AuthProvider>
  );
}

export default App;
