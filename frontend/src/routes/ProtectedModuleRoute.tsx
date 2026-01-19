import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

interface ProtectedModuleRouteProps {
  module: string;
  children: ReactNode;
}

const ProtectedModuleRoute = ({ module, children }: ProtectedModuleRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ADMIN ko full access
  if (user.role?.toUpperCase() === "ADMIN") {
    return <>{children}</>;
  }

  // Module permission check
  if (!user.allowedModules || !user.allowedModules.includes(module)) {
    return <Navigate to="/home/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedModuleRoute;
