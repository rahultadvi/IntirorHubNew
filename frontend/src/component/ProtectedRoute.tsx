import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: JSX.Element;
  module?: string;   // optional
}

const ProtectedRoute = ({ children, module }: Props) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin ko sab access
  if (user.role === "ADMIN") {
    return children;
  }

  // Module permission check
  if (module && !user.allowedModules?.includes(module)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
};

export default ProtectedRoute;
