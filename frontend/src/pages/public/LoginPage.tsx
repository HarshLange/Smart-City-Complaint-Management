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


  React.useEffect(() => {
    const errParam = searchParams.get("error") || searchParams.get("error_description");
    if (errParam) {
      setError(decodeURIComponent(errParam).replace(/\+/g, " "));
    }
  }, [searchParams]);

  const handleGoogleSignIn = () => {
    const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
    const supabaseUrl = rawSupabaseUrl
      ? rawSupabaseUrl.replace(/\/+$/, "")
      : "https://sagibkveeaciobapkgrt.supabase.co";
    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/callback`);
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${callbackUrl}`;
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
    <div id="main-content" className="min-h-[calc(100vh-12rem)] flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 mb-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded p-1"
        >
          <div className="w-10 h-10 rounded bg-gov-navy flex items-center justify-center text-white border border-slate-700 shadow-xs">
            <Building2 className="w-5 h-5 text-blue-200" aria-hidden="true" />
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">CivicPulse</span>
        </Link>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-1.5">
          Municipal Access
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Sign In to Your Account
        </h1>
        <p className="mt-0.5 text-xs text-slate-600 max-w-sm mx-auto">
          Authorized municipal issue reporting, automated triage, and administrative governance.
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-5 sm:py-6 px-4 sm:px-7 rounded-md border border-slate-200 shadow-panel space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="name@domain.com"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 touch-manipulation"
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
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
              className="w-full min-h-[46px] py-2.5 rounded-md text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-subtle touch-manipulation"
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

          {/* OAuth Provider Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2.5 text-slate-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Supabase Google OAuth Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-md border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-subtle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 touch-manipulation"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google (Citizen Sign-In)</span>
          </button>

          <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-100">
            Need a citizen account?{" "}
            <Link to="/register" className="font-semibold text-blue-700 hover:underline min-h-[40px] inline-flex items-center touch-manipulation">
              Create Citizen Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
