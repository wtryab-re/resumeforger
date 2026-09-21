import React from "react";
import { 
  FileText, 
  Plus,
  HelpCircle,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { MasterProfile } from "../types";
import { useAuth } from "../context/AuthContext";
import { LogoIcon } from "./LogoIcon";

interface NavbarProps {
  onOpenApiKeyModal: () => void;
  onOpenNewApplication: () => void;
  onNavigateToProfile: () => void;
  onNavigateToDashboard: () => void;
  onOpenTutorial?: () => void;
  activeView: "dashboard" | "profile" | "application-detail";
  masterProfile: MasterProfile;
  isApiKeyConfigured: boolean;
  isCustomKey: boolean;
  totalApps: number;
  avgAtsScore: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenApiKeyModal,
  onOpenNewApplication,
  onNavigateToProfile,
  onNavigateToDashboard,
  onOpenTutorial,
  activeView,
  isApiKeyConfigured,
  isCustomKey,
}) => {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center px-3 sm:px-6 lg:px-8 shrink-0">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Main Navigation */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <button 
            type="button"
            onClick={onNavigateToDashboard}
            className="flex items-center gap-2 cursor-pointer select-none text-left shrink-0 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src="/logo.png" 
                alt="ResumeForge AI Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              ResumeForge AI
            </span>
          </button>

          {/* Navigation Links - Single Profile Link */}
          <nav className="flex items-center gap-1 sm:border-l sm:border-slate-200 sm:pl-4">
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeView === "dashboard" || activeView === "application-detail"
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Resumes
            </button>
            <button
              type="button"
              onClick={onNavigateToProfile}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeView === "profile"
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Profile
            </button>
          </nav>
        </div>

        {/* Right Actions: API Key & Tailor Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Guide / Tutorial Button */}
          {onOpenTutorial && (
            <button
              type="button"
              onClick={onOpenTutorial}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 rounded-md px-2 sm:px-2.5 py-1.5 border border-slate-200 text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Product Guide & Tutorial"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline text-[11px] font-medium">Guide</span>
            </button>
          )}

          {/* Subtle API Key Status */}
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 rounded-md px-2 sm:px-2.5 py-1.5 border border-slate-200 text-xs text-slate-600 transition-colors cursor-pointer"
            title="Configure Gemini API Key"
          >
            <span 
              className={`w-1.5 h-1.5 rounded-full ${
                isCustomKey
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }`}
            />
            <span className="hidden sm:inline text-[11px] font-medium">
              {isCustomKey ? "API Active" : "Set API Key"}
            </span>
          </button>

          {/* New Resume CTA */}
          <button
            type="button"
            onClick={onOpenNewApplication}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Tailor Resume</span>
            <span className="inline xs:hidden sm:hidden">Tailor</span>
          </button>

          {/* User Sign Out */}
          {user && (
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
              <button
                type="button"
                onClick={() => signOut()}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title={`Signed in as ${user.email || "Google User"}. Click to log out.`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px] max-w-[110px] truncate">
                  {user.displayName || user.email?.split("@")[0] || "Log out"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
