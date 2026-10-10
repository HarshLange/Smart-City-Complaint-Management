import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
  UserPlus,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export const RegisterPage: React.FC = () => {
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters in length.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        phone_number: phoneNumber.trim() || undefined,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err.message || "Registration was unsuccessful. Please check your information."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="main-content" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 mb-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded p-1"
        >
          <div className="w-10 h-10 rounded bg-gov-navy flex items-center justify-center text-white border border-slate-700">
            <Building2 className="w-5 h-5 text-blue-200" aria-hidden="true" />
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">CivicPulse</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Create Citizen Account
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Register to view complaint history, receive direct updates, and manage civic reports.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 sm:py-8 px-4 sm:px-8 rounded-md border border-slate-200 shadow-panel space-y-4 sm:space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Full Legal or Preferred Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="e.g. Eleanor Vance"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 touch-manipulation"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@domain.com"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 touch-manipulation"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Contact Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoComplete="tel"
                  placeholder="+1 (555) 012-3456"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 touch-manipulation"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Password (Minimum 8 Characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  className="w-full min-h-[44px] pl-9 pr-12 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 touch-manipulation"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700 rounded-md touch-manipulation"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-2.5 rounded-md text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-subtle touch-manipulation"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-100">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-blue-700 hover:underline min-h-[40px] inline-flex items-center touch-manipulation">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
