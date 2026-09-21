import React, { useState } from "react";
import { 
  User, 
  Sparkles, 
  ShieldCheck, 
  FileDown, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  X,
  Compass
} from "lucide-react";

export interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface Step {
  title: string;
  badge: string;
  headline: string;
  description: string;
  highlights: string[];
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}

const STEPS: Step[] = [
  {
    badge: "Step 1 of 4",
    title: "Master Profile",
    headline: "Your Central Single Source of Truth",
    description: "Fill in your background once—work history, degrees, skills, volunteer work, and custom fields. ResumeForge pulls all factual details directly from this profile, preventing hallucinations.",
    highlights: [
      "Modular section-by-section editing with instant auto-save",
      "Upload a custom profile photo or paste text for automated parsing",
      "Full control over every field, metric, and bullet point"
    ],
    icon: User,
    iconBg: "bg-blue-50 text-blue-700 border-blue-200"
  },
  {
    badge: "Step 2 of 4",
    title: "1-Click AI Resume Tailoring",
    headline: "Target Any Job Description Instantly",
    description: "Paste a target job title, company, and raw job posting. Gemini automatically extracts key requirements, calculates high-priority keywords, and rewrites bullet points to match the role.",
    highlights: [
      "Select your preferred Gemini model (Flash, Pro, or 2.5)",
      "Strictly truth-grounded against your Master Profile experience",
      "Automatic generation of tailored ATS-ready resume draft"
    ],
    icon: Sparkles,
    iconBg: "bg-purple-50 text-purple-700 border-purple-200"
  },
  {
    badge: "Step 3 of 4",
    title: "ATS Scanner & Live Keywords",
    headline: "Deep Match Scoring & Gap Analysis",
    description: "Inspect match scores (0–100%) against real applicant tracking system standards. View matched vs missing keywords, role qualification breakdowns, and specific recommendations.",
    highlights: [
      "Clear breakdown of hard technical skills vs core qualifications",
      "Interactive suggestions for closing critical keyword gaps",
      "One-click tailored Cover Letter generation matching the same job"
    ],
    icon: ShieldCheck,
    iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  {
    badge: "Step 4 of 4",
    title: "ATS-Safe PDF & DOCX Export",
    headline: "Standard Single-Column Times New Roman",
    description: "Download perfectly formatted Word (.docx) and PDF files formatted to pass applicant tracking systems without parse errors, complex tables, or multi-column traps.",
    highlights: [
      "Single-column Ivy League & ATS industry standard formatting",
      "Consistent 0.75-inch margins, clear header hierarchies, and date formatting",
      "Export both tailored resume and personalized cover letter anytime"
    ],
    icon: FileDown,
    iconBg: "bg-slate-100 text-slate-800 border-slate-300"
  }
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div 
      id="tutorial-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div 
        id="tutorial-modal-card"
        className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900">Welcome to ResumeForge AI</span>
              <p className="text-[11px] text-slate-500">Quick product tour & guide</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Indicators */}
        <div className="px-5 sm:px-6 pt-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex 
                    ? "w-8 bg-slate-900" 
                    : idx < currentStepIndex 
                    ? "w-4 bg-slate-400" 
                    : "w-4 bg-slate-200"
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-5 sm:px-6 py-5">
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 ${currentStep.iconBg}`}>
              <currentStep.icon className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 mb-1">
                {currentStep.badge} • {currentStep.title}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {currentStep.headline}
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
            {currentStep.description}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Key Capabilities
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {currentStep.highlights.map((highlight, hIdx) => (
                <li key={hIdx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer border border-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <span>{isLastStep ? "Get Started" : "Next Step"}</span>
              {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
