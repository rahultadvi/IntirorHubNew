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
import Landing from "./pages/Landing";
import UserListing from "./pages/UserListing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminSignup from "./pages/AdminSignup";
import Adminpanel from "./pages/Adminpanel";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SiteProvider } from "./context/SiteContext";
import AccessDenied from "./pages/AccessDenied";

// LoadingScreen removed

const PublicRoute = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth();

  // Removed loading screen

  if (token) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { token } = useAuth();

  // Removed loading screen

  if (token) {
    return <Navigate to="/home" replace />;
  }

  return <Landing />;
};

// const ProtectedRoute = ({ children }: { children: ReactElement }) => {
//   const { token } = useAuth();

//   // Removed loading screen

//   if (!token) {
//     return <Navigate to="/login" replace />;
//   }

//   return children;
// };

interface ProtectedRouteProps {
  children: ReactElement;
  module?: string;   // optional, kyunki /home layout me module nahi hota
}

const ProtectedRoute = ({ children, module }: ProtectedRouteProps) => {
  const { token, user } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Admin ko sab modules allowed
  if (user?.role === "ADMIN") {
    return children;
  }

  // Agar module diya hai aur user ke paas wo module nahi hai
 if (module && !user?.allowedModules?.includes(module)) {
  return <Navigate to="/home/access-denied" replace />;
}


  return children;
};
 
const AdminRoute = ({ children }: { children: ReactElement }) => {
  const { token, user } = useAuth();

  // Removed loading screen

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const ResetPasswordCatch: React.FC = () => {
    // const location = useLocation();
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
        {/* ROOT */}
        <Route path="/" element={<RootRedirect />} />

        {/* PUBLIC ROUTES */}
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
        {/* MAIN PROTECTED LAYOUT */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* HOME */}
          <Route
            index
            element={
              <ProtectedRoute module="home">
                <Home />
              </ProtectedRoute>
            }
          />
          {/* MODULE ROUTES */}
          <Route
            path="payments"
            element={
              <ProtectedRoute module="payments">
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
            path="boq"
            element={
              <ProtectedRoute module="boq">
                <BOQ />
              </ProtectedRoute>
            }
          />
          <Route
            path="expenses"
            element={
              <ProtectedRoute module="expenses">
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="feed"
            element={
              <ProtectedRoute module="feed">
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="feed/:id"
            element={
              <ProtectedRoute module="feed">
                <FeedDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="manage-sites"
            element={
              <ProtectedRoute module="manage-sites">
                <ManageSites />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute module="users">
                <UserListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="invite"
            element={
              <AdminRoute>
                <Invite />
              </AdminRoute>
            }
          />
          {/* ACCESS DENIED – INSIDE LAYOUT */}
          <Route path="access-denied" element={<AccessDenied />} />
        </Route>
        {/* ADMIN PANEL */}
        <Route
          path="/adminpanel"
          element={
            <AdminRoute>
              <Adminpanel />
            </AdminRoute>
          }
        />
        {/* CATCH ALL */}
        <Route path="*" element={<ResetPasswordCatch />} />
      </Routes>
    </Router>
  </SiteProvider>
</AuthProvider>
  );
}

export default App;
