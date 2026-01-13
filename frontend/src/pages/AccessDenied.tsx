import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="bg-white shadow-xl rounded-xl p-8 max-w-md w-full text-center border">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-red-100 rounded-full">
            <ShieldOff className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>

        <p className="mt-2 text-sm text-gray-600">
          You do not have permission to access this module.
          If you believe this is a mistake, please contact your administrator.

        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/home"
            className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
          >
            Go to Dashboard
          </Link>

          <a
            href="https://wa.me/918320354644"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition"
          >
            Contact Admin
          </a>
        </div>
      </div>
    </div>
  );
}
