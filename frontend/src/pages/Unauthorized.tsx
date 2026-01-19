import { useNavigate } from "react-router-dom";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-200">
        
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-4 rounded-full">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
        </div>
        {/* Subtitle */}
        <h2 className="mt-2 text-xl font-semibold text-gray-800">
          Access Denied
        </h2>

        {/* Message */}
        <p className="mt-2 text-sm text-gray-600">
          You don’t have permission to view this page.  
          Please contact your administrator if you think this is a mistake.
        </p>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>

          <button
            onClick={() => navigate("/home")}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 transition"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-xs text-gray-400">
          Error Code: 403 • Unauthorized Access
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;
