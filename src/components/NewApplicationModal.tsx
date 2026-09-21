import React, { useEffect, useState } from "react";
import { 
  X, 
  FileText, 
  Check, 
  Loader2, 
  AlertCircle, 
  ArrowRight
} from "lucide-react";
import { JobApplication, MasterProfile } from "../types";
import { tailorResume, generateCoverLetter, MissingApiKeyError } from "../utils/api";
import { masterProfileToPlainText } from "../utils/masterProfile";
import { ModelSelector } from "./ModelSelector";
import { DEFAULT_MODEL, type GeminiModelId } from "../data/models";
import { useToast } from "./Toast";
import { ResumeTemplateSelector } from "./ResumeTemplateSelector";
import { 
  ResumeTemplate, 
  BUILTIN_RESUME_TEMPLATES, 
  getStoredTemplateId 
} from "../data/resumeTemplates";
import { useAuth } from "../context/AuthContext";

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

interface NewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplicationCreated: (app: JobApplication) => void;
  masterProfile: MasterProfile;
  onOpenMasterProfileModal?: () => void;
  onNavigateToProfile?: () => void;
  onOpenApiKeyModal?: () => void;
}

export const NewApplicationModal: React.FC<NewApplicationModalProps> = ({
  isOpen,
  onClose,
  onApplicationCreated,
  masterProfile,
  onNavigateToProfile,
  onOpenApiKeyModal,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Job details
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [resumeText, setResumeText] = useState("");

  // The modal stays mounted between openings, so seeding resumeText from a
  // useState initialiser froze it at whatever the profile was on page load —
  // profile edits made later in the session were silently ignored. Re-seed
  // every time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setResumeText(masterProfile ? masterProfileToPlainText(masterProfile) : "");
  }, [isOpen, masterProfile]);

  // Resume Template
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>(() => {
    const storedId = getStoredTemplateId();
    return (
      BUILTIN_RESUME_TEMPLATES.find((t) => t.id === storedId) ||
      BUILTIN_RESUME_TEMPLATES[0]
    );
  });

  // Model & Tone
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(DEFAULT_MODEL);
  const [tailorTone, setTailorTone] = useState<"balanced" | "impactful" | "concise" | "enthusiastic">("balanced");
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);

  // Processing state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState<string>("");
  const [generationError, setGenerationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartTailoring = async () => {
    if (!jobDescription.trim() || !resumeText.trim()) {
      setGenerationError("Please provide both a target job description and your resume text.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setProgressStage(
      includeCoverLetter
        ? `Optimizing resume and drafting cover letter with ${selectedModel}...`
        : `Optimizing resume with ${selectedModel} following ${selectedTemplate.name}...`
    );

    try {
      const shared = {
        resumeText,
        jobDescription,
        roleTitle: roleTitle.trim() || "Target Role",
        companyName: companyName.trim() || "Target Company",
        tone: tailorTone,
        model: selectedModel,
      };

      // The cover letter only needed the applicant's name from the tailoring
      // response, and the profile already has it - so both calls go out at
      // once instead of one waiting on the other.
      const applicantName = masterProfile?.fullName?.trim() || "Applicant";

      const [tailorResult, coverResult] = await Promise.allSettled([
        tailorResume(user?.uid, { ...shared, resumeTemplate: selectedTemplate }),
        includeCoverLetter
          ? generateCoverLetter(user?.uid, { ...shared, applicantName })
          : Promise.resolve(undefined),
      ]);

      if (tailorResult.status === "rejected") {
        throw tailorResult.reason;
      }

      let coverLetterData = undefined;
      if (coverResult.status === "fulfilled") {
        coverLetterData = coverResult.value;
      } else if (includeCoverLetter) {
        // A failed cover letter should not discard a successful resume.
        showToast({
          type: "error",
          title: "Cover Letter Not Generated",
          message: describeError(coverResult.reason, "Could not generate the cover letter."),
        });
      }

      setProgressStage("Finalizing tailored application...");

      const newApp: JobApplication = {
        id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        company: companyName.trim() || "Target Company",
        roleTitle: roleTitle.trim() || "Target Role",
        status: "Saved",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        jobDescription,
        originalResume: resumeText,
        tailoredResume: tailorResult.value.tailoredResume,
        atsAnalysis: tailorResult.value.atsAnalysis,
        tailoringChanges: tailorResult.value.tailoringChanges,
        coverLetter: coverLetterData,
        templateUsed: selectedTemplate.name,
        tags: ["AI Tailored", tailorTone],
      };

      // Clean slate target job inputs upon successful generation
      setCompanyName("");
      setRoleTitle("");
      setJobDescription("");

      onApplicationCreated(newApp);
    } catch (err: any) {
      console.error(err);

      if (err instanceof MissingApiKeyError) {
        showToast({
          type: "warning",
          title: "API Key Missing",
          message: err.message,
          actionLabel: onOpenApiKeyModal ? "Enter Key" : undefined,
          onAction: onOpenApiKeyModal,
        });
        return; // the finally block clears the generating state
      }

      const fullError = describeError(err, "An unexpected error occurred during tailoring.");
      setGenerationError(fullError);
      showToast({
        type: "error",
        title: "Gemini Model Error",
        message: fullError,
      });
    } finally {
      setIsGenerating(false);
      setProgressStage("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full border border-slate-200 shadow-lg overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tailor Resume & Cover Letter
            </h3>
            <p className="text-[11px] text-slate-500">
              ATS-aligned optimization grounded strictly in your experience
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
          {/* Generation Progress Banner */}
          {isGenerating && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-700 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Optimizing Resume & Cover Letter</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{progressStage || "Processing documents..."}</p>
              </div>
            </div>
          )}

          {generationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Tailoring Error: </span>
                <span>{generationError}</span>
              </div>
            </div>
          )}

          {/* Target Job Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-900 uppercase tracking-wide text-[11px]">
                Target Job
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Target Role Title</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Target role title"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Job Description & Requirements</label>
              <textarea
                rows={5}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description and requirements here..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans leading-relaxed"
              />
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* Resume Source */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-900 uppercase tracking-wide text-[11px]">
                Resume Source
              </label>
              {onNavigateToProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToProfile();
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Edit Master Profile
                </button>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {masterProfile?.fullName || "Candidate Master Profile"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {masterProfile?.title || "Base Profile Ready for Tailoring"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="font-medium text-[11px]">Ready</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* Template Selection */}
          <ResumeTemplateSelector
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            onRequireApiKey={() => onOpenApiKeyModal?.()}
          />

          <div className="border-t border-slate-200" />

          {/* Model & Options */}
          <div className="space-y-3">
            <label className="font-semibold text-slate-900 uppercase tracking-wide text-[11px]">
              AI Model & Tone
            </label>
            <ModelSelector
              selectedModel={selectedModel}
              onChangeModel={setSelectedModel}
              label="Select Gemini Model"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium shrink-0">Tone:</span>
                <select
                  value={tailorTone}
                  onChange={(e) => setTailorTone(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="balanced">Balanced (Professional & grounded)</option>
                  <option value="impactful">High-Impact (Metrics & leadership)</option>
                  <option value="concise">Concise (Crisp & direct)</option>
                  <option value="enthusiastic">Enthusiastic (Passionate)</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeCoverLetter}
                    onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-400"
                  />
                  <span>Generate matching Cover Letter</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartTailoring}
            disabled={isGenerating}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Optimizing with Gemini...</span>
              </>
            ) : (
              <>
                <span>{includeCoverLetter ? "Tailor Resume & Cover Letter" : "Tailor Resume"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
