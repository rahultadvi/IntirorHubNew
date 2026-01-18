import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, Eye, EyeOff, Phone, Briefcase, User, Loader2 } from "lucide-react";
import { authApi, ApiError } from "../services/api";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setOtpError(null);
    setOtpMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const normalizedEmail = formData.email.trim();
      await authApi.registerAdmin({
        name: formData.name.trim() || undefined,
        email: normalizedEmail,
        phone: formData.phone.trim(),
        companyName: formData.companyName.trim(),
        password: formData.password,
      });

      setRegisteredEmail(normalizedEmail);
      setOtp("");
      setStep("verify");
      setSuccess("Verification code sent to your email.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to create account";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!registeredEmail) {
      return;
    }

    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      setOtpError("Enter the 6-digit code sent to your email.");
      return;
    }

    try {
      setVerifying(true);
      setOtpError(null);
      setOtpMessage(null);

      const response = await authApi.verifyOtp({
        email: registeredEmail,
        otp: trimmedOtp,
      });

      setOtpMessage(response.message || "Account verified successfully.");
      setTimeout(() => {
        navigate("/login", { replace: true, state: { email: registeredEmail } });
      }, 1200);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to verify code";
      setOtpError(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!registeredEmail) {
      return;
    }

    try {
      setResending(true);
      setOtpError(null);

      const response = await authApi.resendOtp({ email: registeredEmail });
      setOtpMessage(response.message || "Verification code sent.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to resend code";
      setOtpError(message);
    } finally {
      setResending(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setRegisteredEmail(null);
    setOtp("");
    setOtpError(null);
    setOtpMessage(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen flex bg-white text-black">
      <div className="hidden lg:flex lg:w-1/2 bg-[#050505] text-white flex-col justify-center items-center p-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#111111,_#050505_60%)] opacity-80"></div>
        <div className="relative z-10 text-center max-w-lg">
          <h1 className="text-5xl font-semibold leading-tight mb-6">
            Fast, Efficient and Productive
          </h1>
          <p className="text-gray-200 text-lg leading-relaxed">
            SiteZero gives you the clarity to manage construction projects without the chaos.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center py-16 px-6 sm:px-12">
        <div className="w-full max-w-lg space-y-8">
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
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Get started</p>
            <h1 className="text-3xl font-semibold text-black">Create admin access</h1>
            <p className="text-sm text-gray-500">
              Fill in your company details. The first user is always the admin and receives an email with the password you submit.
            </p>
          </div>

          {step === "form" ? (
            <>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                    Full name (optional)
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                    Phone number
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="1234567890"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      />
                    </div>
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                  Company name
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="ZantaTech Interiors"
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                </label>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                    Password
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a password"
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

                  <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                    Confirm password
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Repeat password"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-12 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                </div>

                <label className="flex items-start gap-3 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    required
                    className="mt-1 h-4 w-4 rounded border border-gray-300 text-black focus:ring-black"
                  />
                  <span>
                    I agree to the privacy policy and understand the admin password will be emailed in plain text.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-black py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/40 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {(otpError || error) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {otpError || error}
                </div>
              )}

              {(otpMessage || success) && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                  {otpMessage || success}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit verification code sent to{" "}
                    <span className="font-semibold text-gray-900">{registeredEmail}</span>.
                  </p>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-center text-lg tracking-[0.5em] text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full rounded-xl bg-black py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/40 flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying
                    </>
                  ) : (
                    "Verify and continue"
                  )}
                </button>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    className="underline decoration-gray-400 transition hover:text-black"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="font-medium text-black transition hover:text-black/80 disabled:text-gray-400"
                  >
                    {resending ? "Sending..." : "Resend code"}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="text-center text-sm text-gray-500">
            Already registered? <Link to="/login" className="font-medium text-black">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
