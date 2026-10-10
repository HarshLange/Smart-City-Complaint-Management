import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/authStore";

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processedRef = React.useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const processCallback = async () => {
      processedRef.current = true;
      try {
        // Parse access_token from URL hash (#access_token=...&token_type=bearer...) or search params
        let accessToken: string | null = null;
        let authError: string | null = null;

        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          accessToken = hashParams.get("access_token");
          authError = hashParams.get("error_description") || hashParams.get("error");
        }

        if (!accessToken && searchParams) {
          accessToken = searchParams.get("access_token");
          authError = authError || searchParams.get("error_description") || searchParams.get("error");
        }

        if (authError) {
          api.setToken(null);
          setStatus("error");
          setErrorMessage(decodeURIComponent(authError).replace(/\+/g, " "));
          return;
        }

        // If no token in URL, check if already authenticated in local store
        if (!accessToken) {
          const existingToken = api.getToken();
          if (existingToken) {
            accessToken = existingToken;
          }
        }

        if (accessToken) {
          // Temporarily stage token in client storage to allow /auth/me request
          api.setToken(accessToken);

          // Synchronize profile and verify identity with municipal backend
          const result = await checkAuth();

          if (!result.success || !result.user) {
            // Identity verification failed: purge token immediately to avoid broken session state
            api.setToken(null);
            setStatus("error");
            setErrorMessage(result.error || "Failed to establish authenticated citizen session with municipal backend.");
            return;
          }

          // Clean sensitive tokens from browser URL history after successful handshake
          try {
            window.history.replaceState(null, "", window.location.pathname);
          } catch {
            // Browser history security restriction fallback
          }

          setStatus("success");
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 500);
          return;
        }

        // If no token or error present
        api.setToken(null);
        setStatus("error");
        setErrorMessage("No valid authentication session token was returned from the identity provider.");
      } catch (err: any) {
        api.setToken(null);
        setStatus("error");
        setErrorMessage(err.message || "Failed to establish authenticated session.");
      }
    };

    processCallback();
  }, [checkAuth, navigate, searchParams]);

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
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Municipal Identity Verification
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Completing cryptographic session handshake with Supabase Auth...
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 rounded-md border border-slate-200 shadow-panel text-center space-y-4">
          {status === "processing" && (
            <div className="py-6 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-700 animate-spin mx-auto" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-800">
                Verifying municipal authentication credentials...
              </p>
              <p className="text-xs text-slate-500">
                Please wait while your citizen session is synchronized with the secure portal.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="py-6 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" aria-hidden="true" />
              <p className="text-sm font-semibold text-emerald-900">
                Session verified successfully.
              </p>
              <p className="text-xs text-slate-500">
                Redirecting to Citizen Dashboard...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="py-4 space-y-4">
              <div
                role="alert"
                className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2.5 text-left"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-red-900 mb-0.5">Authentication Error</p>
                  <p>{errorMessage}</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
