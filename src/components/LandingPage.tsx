import React, { useState } from "react";
import { 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  KeyRound, 
  ArrowRight, 
  Lock, 
  Mail, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { LegalModal, LegalModalType } from "./LegalModal";
import { LogoIcon } from "./LogoIcon";

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { showToast } = useToast();

  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await signInWithGoogle();
      showToast({
        type: "success",
        title: "Welcome!",
        message: "Signed in successfully with your Google account."
      });
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        // User closed or dismissed the popup voluntarily, no error toast or alarming message needed
        return;
      }
      console.error(err);
      if (err.code === "auth/configuration-not-found") {
        setErrorMessage("Google Sign-In is not yet enabled in your Firebase Console. Go to Firebase Console > Authentication > Sign-in method, click Google, and click Enable.");
      } else {
        setErrorMessage(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      if (authMode === "signup") {
        await signUpWithEmail(email, password);
        showToast({
          type: "success",
          title: "Account Created",
          message: "Welcome to ResumeForge AI. Your profile and resumes are saved to the cloud."
        });
      } else {
        await signInWithEmail(email, password);
        showToast({
          type: "success",
          title: "Welcome Back",
          message: "Signed in successfully."
        });
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Authentication failed.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        msg = "Invalid email or password. If you don't have an account yet, switch to 'Create Account'.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Please switch to 'Log In'.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
      {/* Top Simple Nav */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="ResumeForge AI Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight text-base">ResumeForge AI</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAuthMode(authMode === "signup" ? "login" : "signup");
                setErrorMessage("");
              }}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {authMode === "signup" ? "Already have an account? Log In" : "Need an account? Sign Up"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Single Section Hero & Auth */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Hero Pitch */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Free Forever • Zero Subscription Fees</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
                100% Free ATS Resume & Cover Letter Tailoring
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Tailor targeted, ATS-optimized resumes and cover letters using your own free Gemini API key. All your data is saved to your secure cloud account so you can return anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <KeyRound className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">Your Own Free Key</span>
                  <span className="text-slate-500">Bring your free Google AI Studio key with zero hidden costs.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">Cloud Saved Forever</span>
                  <span className="text-slate-500">Log in anytime, anywhere. Your profile stays safe and private.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Auth Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {authMode === "signup" ? "Create Free Account" : "Log In to Your Account"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {authMode === "signup" 
                  ? "Sign up with Firebase to save and sync your resumes." 
                  : "Log in with Firebase to access your saved profile & applications."}
              </p>
            </div>

            {/* Google Quick Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full absolute"></div>
              <span className="bg-white px-3 text-[11px] text-slate-400 relative uppercase font-semibold tracking-wider">
                Or with email
              </span>
            </div>

            {errorMessage && (
              <div className="mb-4 p-2.5 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <span>{authMode === "signup" ? "Sign Up Free" : "Log In"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "login" : "signup");
                  setErrorMessage("");
                }}
                className="text-xs text-slate-600 hover:text-slate-950 font-medium cursor-pointer"
              >
                {authMode === "signup" ? (
                  <>Already have an account? <span className="underline font-semibold">Log in</span></>
                ) : (
                  <>Don't have an account yet? <span className="underline font-semibold">Sign up free</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer note */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white/50">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span>go get that bag &lt;3 and referral me as a thank you</span>
            <span className="hidden sm:inline">•</span>
            <span>
              made with love{" "}
              <a
                href="https://github.com/wtryab-re"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-800 hover:text-indigo-600 underline font-medium transition-colors"
              >
                wtryab
              </a>
            </span>
          </div>

          {/* Privacy & Terms */}
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setLegalModalType("privacy")}
              className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => setLegalModalType("terms")}
              className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      {/* Privacy Policy & Terms Modal */}
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
};
