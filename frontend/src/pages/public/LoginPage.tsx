import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export const LoginPage: React.FC = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login({ email, password });
      const redirect = searchParams.get("redirect");
      if (redirect) {
        navigate(redirect);
      } else if (user.role === "ADMIN") {
        navigate("/admin");
      } else if (user.role === "OFFICER") {
        navigate("/workspace");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
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
          Sign In to Your Account
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Enter your authorized credentials to access your citizen or municipal workspace.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 rounded-md border border-slate-200 shadow-panel space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="name@domain.gov"
                  className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700 rounded p-0.5"
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
              className="w-full py-2.5 rounded text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-subtle"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Development Testing Sandbox (Safely separated collapsible helper) */}
          <details className="pt-3 border-t border-slate-100 text-xs">
            <summary className="cursor-pointer font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 select-none">
              <span>Local Sandbox Accounts (Development Only)</span>
            </summary>
            <div className="mt-2.5 p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-[11px] text-slate-500">
                Quick-select test profiles provisioned in the local database:
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => fillDemo("citizen@smartcity.gov", "Citizen@SmartCity2026!")}
                  className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded"
                >
                  Citizen
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("officer.road@smartcity.gov", "Officer@SmartCity2026!")}
                  className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded"
                >
                  Road Officer
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("admin@smartcity.gov", "Admin@SmartCity2026!")}
                  className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded"
                >
                  Admin
                </button>
              </div>
            </div>
          </details>

          <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-100">
            Need a citizen account?{" "}
            <Link to="/register" className="font-semibold text-blue-700 hover:underline">
              Create Citizen Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
