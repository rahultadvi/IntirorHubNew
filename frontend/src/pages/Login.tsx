import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { authApi, ApiError } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useAuth();

  useEffect(() => {
    const prefilledEmail = (location.state as { email?: string } | null)?.email;
    if (prefilledEmail) {
      setFormData((prev) => ({ ...prev, email: prefilledEmail }));
    }
  }, [location.state]);

  useEffect(() => {
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      // Restore body scroll on unmount
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const response = await authApi.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (response.token && response.user) {
        setSession(response.token, response.user);
      }

      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex bg-white text-black overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 bg-[#040404] text-white flex-col justify-center items-center p-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_#060606,_#000000_60%)] opacity-80"></div>
        <div className="relative z-10 text-center max-w-lg">
          <h1 className="text-5xl font-semibold leading-tight mb-6">
            Fast, Efficient and Productive
          </h1>
          <p className="text-gray-200 text-lg leading-relaxed">
            SiteZero gives you the clarity to manage construction projects without the chaos.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 overflow-y-auto py-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-3 no-underline">
              <div className="p-3 bg-black text-white rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-wide uppercase text-black">SiteZero</p>
                <p className="text-xs text-gray-500">Interior Project Platform</p>
              </div>
            </Link>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Welcome back</p>
            <h1 className="text-3xl font-semibold text-black">Sign in to continue</h1>
            <p className="text-sm text-gray-500">
              Use your admin credentials. A confirmation email with the password you enter will be sent automatically.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Work email
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="hasnen@gmail.com"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Password
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-12 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span></span>
              <Link to="/forgot-password" className="text-black font-medium">Forgot password?</Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Need an admin account? <Link to="/signup" className="font-medium text-black">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
