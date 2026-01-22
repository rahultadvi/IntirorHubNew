import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: React.ReactElement;
  module: string;
}

const ProtectedModuleRoute: React.FC<Props> = ({ children, module }) => {
  const { token, user } = useAuth();

  // 1. Not logged in
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Admin has full access
  if (user?.role?.toUpperCase() === "ADMIN") {
    return children;
  }

  // 3. If allowedModules missing → Unauthorized
  if (!user?.allowedModules || user.allowedModules.length === 0) {
    console.log("No allowedModules found for user");
    return <Navigate to="/home/unauthorized" replace />;
  }

  // 4. If this module not allowed → Unauthorized
  if (!user.allowedModules.includes(module)) {
    console.log("Module not allowed:", module, user.allowedModules);
    return <Navigate to="/home/unauthorized" replace />;
  }

  return children;
};

export default ProtectedModuleRoute;
