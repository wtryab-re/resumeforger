import React, { useState } from "react";
import { X, Shield, FileText, CheckCircle2, Lock, Eye, Database, Sparkles } from "lucide-react";
import { LogoIcon } from "./LogoIcon";

export type LegalModalType = "privacy" | "terms" | null;

interface LegalModalProps {
  type: LegalModalType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">(type || "privacy");

  if (!type) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="ResumeForge AI Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {activeTab === "privacy" ? "Privacy Policy" : "Terms of Service"}
              </h3>
              <p className="text-[11px] text-slate-500">ResumeForge AI Legal & Security</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch inside modal */}
            <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("privacy")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === "privacy"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("terms")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === "terms"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Terms
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Body */}
        <div className="overflow-y-auto px-6 py-6 text-xs text-slate-600 space-y-5 leading-relaxed selection:bg-slate-200">
          {activeTab === "privacy" ? (
            <div className="space-y-5">
              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Information We Collect
                </h4>
                <p>
                  ResumeForge AI collects and stores only the data necessary to provide resume tailoring and application tracking services:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                  <li>
                    <strong className="font-semibold text-slate-900">Account Credentials:</strong> Email address and authentication tokens via Google OAuth or Firebase Authentication.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Career & Profile Data:</strong> Master profile details (work history, skills, education, custom fields) and target job descriptions input by you.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Encrypted Secrets:</strong> If you supply your personal Google Gemini API key, it is encrypted locally on your device via AES-GCM (Web Crypto API) and never logged in plain text.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Google User Data Access, Use, Storage & Sharing Disclosures
                </h4>
                <p>
                  In compliance with Google API Services User Data Policy and verification requirements, this section comprehensively discloses how ResumeForge AI handles Google user data:
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900 block">Access:</span>
                    When you sign in using Google, ResumeForge AI accesses only your basic public profile information (email address, display name, and unique Google ID / UID) necessary to authenticate you. We do not request or access private Google Drive files, Gmail, Google Contacts, or other Google services.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">Use:</span>
                    Google user data is used solely to authenticate your session, associate your saved tailored resumes and master profile with your account, and deliver the core functionality of the application. We do not use Google user data for advertising, marketing, or behavioral profiling.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">Storage:</span>
                    Your account identifier is stored in your dedicated, authenticated Firestore database record. Data is protected by strict Firebase Security Rules that ensure only your authenticated account can access or modify your records.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">Sharing:</span>
                    ResumeForge AI does not sell, rent, or share Google user data with any third-party advertisers, data brokers, or external entities. Google user data is never transferred to any party other than the infrastructure services (Firebase Authentication and Google Cloud) required to host and authenticate your account.
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. Third-Party AI Services & Data Processing
                </h4>
                <p>
                  - When you request resume tailoring, keyword scoring, or cover letter drafting, your entered text and target job specifications are sent to the Google Gemini API to produce your tailored output. Please review Google's official privacy policies and terms regarding their handling of AI service data.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  4. Cookies & Local Browser Storage
                </h4>
                <p>
                  ResumeForge AI uses standard browser local storage exclusively for your active session preferences, tutorial state, and locally encrypted key derivation. We do not use third-party behavioral trackers or advertising cookies.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  5. Data Retention, Updates & Right to Erasure
                </h4>
                <p>
                  You hold complete ownership of your career data. You can export your resumes at any time in DOCX or PDF format. If you choose to delete your account using the in-app "Delete Account" button, all your Firestore profile records, subcollections, and authentication identities are permanently and irreversibly purged.
                </p>
                <p>
                  We are committed to maintaining a current privacy policy and will notify users through in-product notifications if any change occurs in how our application accesses, uses, stores, or shares Google user data.
                </p>
              </section>

              <section className="space-y-1 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                <p>Application: ResumeForge AI (Domain / Host: Verified Application Deployment)</p>
                <p>Last updated: September 2026. For questions regarding your data privacy, contact the developer at wtryab@gmail.com.</p>
              </section>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">Transparent & Ethical Career Tools</p>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    By using ResumeForge AI, you agree to these clear terms governing resume tailoring, responsible AI use, and account integrity.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Acceptance of Terms
                </h4>
                <p>
                  By creating an account or accessing ResumeForge AI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. User Responsibility & Experience Authenticity
                </h4>
                <p>
                  ResumeForge AI uses artificial intelligence to format, rephrase, highlight relevant competencies, and calculate ATS compatibility scores. However:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                  <li>
                    You remain solely responsible for the truthfulness, factual accuracy, and integrity of your resume and employment applications.
                  </li>
                  <li>
                    The Service is configured to strictly reflect only experience provided in your candidate profile; you must review and verify all generated documents prior to job submission.
                  </li>
                  <li>
                    ResumeForge AI does not guarantee employment offers, interviews, or hiring outcomes.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. Acceptable Use
                </h4>
                <p>
                  You agree not to misuse the Service, attempt unauthorized access to other users' accounts, reverse engineer the platform's security mechanisms, or use automated systems to flood or abuse Gemini API quotas.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  4. API Keys & Billing
                </h4>
                <p>
                  Users may configure their own Google Gemini API key. You are solely responsible for compliance with Google's API service terms and any quotas or costs incurred on your personal Google Cloud account.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  5. Disclaimer & Limitation of Liability
                </h4>
                <p>
                  The Service is provided on an "as-is" and "as-available" basis without warranties of any kind. Under no circumstances shall ResumeForge AI or its maintainers be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the application.
                </p>
              </section>

              <section className="space-y-1 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                <p>Last updated: September 2026. ResumeForge AI operates in compliance with standard software utility guidelines.</p>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70">
          <span className="text-[11px] text-slate-500 font-medium">
            ResumeForge AI
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
