import React, { useState } from "react";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  DollarSign,
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  Mail, 
  Calendar, 
  Download, 
  CheckCircle2,
  Trash2,
  Sparkles,
  Loader2
} from "lucide-react";
import { JobApplication, TailoredResume, CoverLetterData } from "../types";
import { ResumePreview } from "./ResumePreview";
import { AtsScannerView } from "./AtsScannerView";
import { CoverLetterPreview } from "./CoverLetterPreview";
import {
  exportResumeToDocx,
  exportCoverLetterToDocx,
  exportResumeToPdf,
  exportCoverLetterToPdf,
} from "../utils/exports";
import { generateCoverLetter, MissingApiKeyError } from "../utils/api";
import { useToast } from "./Toast";
import { useAuth } from "../context/AuthContext";

interface ApplicationDetailProps {
  application: JobApplication;
  onBack: () => void;
  onUpdateApplication: (updated: JobApplication) => void;
  onDeleteApplication: (id: string) => void;
  onOpenApiKeyModal?: () => void;
}

export const ApplicationDetail: React.FC<ApplicationDetailProps> = ({
  application,
  onBack,
  onUpdateApplication,
  onDeleteApplication,
  onOpenApiKeyModal,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"resume" | "ats" | "cover">("resume");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleGenerateCoverLetter = async () => {
    setIsGeneratingCover(true);
    try {
      const coverLetter = await generateCoverLetter(user?.uid, {
        resumeText: application.originalResume,
        jobDescription: application.jobDescription,
        roleTitle: application.roleTitle,
        companyName: application.company,
        tone: "balanced",
        applicantName: application.tailoredResume?.contactInfo?.fullName || "Applicant",
      });

      onUpdateApplication({
        ...application,
        coverLetter,
        updatedAt: new Date().toISOString(),
      });
      showToast({
        type: "success",
        title: "Cover Letter Generated",
        message: `Aligned cover letter successfully created for ${application.company}.`,
      });
    } catch (err: any) {
      if (err instanceof MissingApiKeyError) {
        showToast({
          type: "warning",
          title: "API Key Missing",
          message: err.message,
          actionLabel: onOpenApiKeyModal ? "Enter Key" : undefined,
          onAction: onOpenApiKeyModal,
        });
        return;
      }
      showToast({
        type: "error",
        title: "Gemini Model Error",
        message: err?.message || "Could not generate cover letter.",
      });
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleUpdateResume = (tailoredResume: TailoredResume) => {
    onUpdateApplication({
      ...application,
      tailoredResume,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateCoverLetter = (coverLetter: CoverLetterData) => {
    onUpdateApplication({
      ...application,
      coverLetter,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Resumes & Cover Letters</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Quick Export Master Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Package</span>
            </button>

            {showExportMenu && (
              <div 
                className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 text-xs"
                onClick={() => setShowExportMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Resume Files
                </div>
                {application.tailoredResume && (
                  <>
                    <button
                      onClick={() => void exportResumeToPdf(application.tailoredResume!, `${application.company}_ATS_Resume.pdf`).catch(console.error)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-indigo-600 text-slate-700 flex items-center justify-between"
                    >
                      <span>Resume as PDF</span>
                      <span className="text-[10px] text-slate-400">ATS Clean</span>
                    </button>
                    <button
                      onClick={() => void exportResumeToDocx(application.tailoredResume!, `${application.company}_ATS_Resume.docx`).catch(console.error)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-indigo-600 text-slate-700 flex items-center justify-between"
                    >
                      <span>Resume as DOCX</span>
                      <span className="text-[10px] text-slate-400">Word</span>
                    </button>
                  </>
                )}

                {application.coverLetter && (
                  <>
                    <div className="border-t my-1 border-slate-100" />
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Cover Letter
                    </div>
                    <button
                      onClick={() => void exportCoverLetterToPdf(application.coverLetter!, `${application.company}_Cover_Letter.pdf`).catch(console.error)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-indigo-600 text-slate-700"
                    >
                      Cover Letter as PDF
                    </button>
                    <button
                      onClick={() => void exportCoverLetterToDocx(application.coverLetter!, `${application.company}_Cover_Letter.docx`).catch(console.error)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-indigo-600 text-slate-700"
                    >
                      Cover Letter as DOCX
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Delete action */}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDeleteApplication(application.id)}
                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete Application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Application Overview Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-sm text-slate-800">
              <Building2 className="w-4 h-4 text-slate-400" />
              {application.company}
            </span>
            {application.jobUrl && (
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 font-medium hover:underline"
              >
                <span>Job Posting</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            {application.roleTitle}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {application.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {application.location}
              </span>
            )}
            {application.salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                {application.salary}
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              Created {new Date(application.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* ATS Score Badge summary */}
        {application.atsAnalysis && (
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 tracking-tight">
                {application.atsAnalysis.overallScore}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                ATS Score
              </div>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 tracking-tight">
                {application.atsAnalysis.matchRate}%
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Job Match
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("resume")}
          className={`flex items-center gap-2 py-2.5 px-3 font-medium text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all ${
            activeTab === "resume"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>ATS Tailored Resume</span>
        </button>

        <button
          onClick={() => setActiveTab("ats")}
          className={`flex items-center gap-2 py-2.5 px-3 font-medium text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all ${
            activeTab === "ats"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>ATS Scanner & Tips</span>
          {application.atsAnalysis && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {application.atsAnalysis.overallScore}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("cover")}
          className={`flex items-center gap-2 py-2.5 px-3 font-medium text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "cover"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Cover Letter</span>
          {application.coverLetter ? (
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          ) : (
            <span className="text-[10px] text-slate-400">(None)</span>
          )}
        </button>
      </div>

      {/* Tab Content Rendering */}
      <div>
        {activeTab === "resume" && (
          application.tailoredResume ? (
            <ResumePreview
              tailoredResume={application.tailoredResume}
              originalResume={application.originalResume}
              tailoringChanges={application.tailoringChanges}
              templateUsed={application.templateUsed}
              onUpdateResume={handleUpdateResume}
            />
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-sm">No tailored resume generated yet.</p>
            </div>
          )
        )}

        {activeTab === "ats" && (
          application.atsAnalysis ? (
            <AtsScannerView analysis={application.atsAnalysis} />
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-sm">No ATS scanner analysis available for this application.</p>
            </div>
          )
        )}

        {activeTab === "cover" && (
          application.coverLetter ? (
            <CoverLetterPreview
              coverLetter={application.coverLetter}
              companyName={application.company}
              roleTitle={application.roleTitle}
              jobDescription={application.jobDescription}
              resumeText={application.originalResume}
              onUpdateCoverLetter={handleUpdateCoverLetter}
              onOpenApiKeyModal={onOpenApiKeyModal}
            />
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
              <Mail className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-slate-800">No Cover Letter Generated</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Generate an aligned, concise cover letter targeted specifically to {application.company}'s requirements.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateCoverLetter}
                disabled={isGeneratingCover}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {isGeneratingCover ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Cover Letter for {application.company}</span>
                  </>
                )}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
