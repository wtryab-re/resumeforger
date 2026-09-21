import React, { useState } from "react";
import { 
  Download, 
  FileText, 
  Copy, 
  Check, 
  Sparkles, 
  Edit3, 
  RefreshCw, 
  Eye, 
  Layers, 
  Loader2 
} from "lucide-react";
import { CoverLetterData } from "../types";
import { exportCoverLetterToDocx, exportCoverLetterToPdf } from "../utils/exports";
import { generateCoverLetter, MissingApiKeyError } from "../utils/api";
import { GeminiModelId, GEMINI_MODELS } from "./ModelSelector";
import { useToast } from "./Toast";
import { useAuth } from "../context/AuthContext";
import { sanitizeSignOff, getFormattedCoverLetterDate } from "../utils/coverLetterUtils";

interface CoverLetterPreviewProps {
  coverLetter: CoverLetterData;
  companyName: string;
  roleTitle: string;
  jobDescription: string;
  resumeText: string;
  onUpdateCoverLetter: (updated: CoverLetterData) => void;
  onOpenApiKeyModal?: () => void;
}

export const CoverLetterPreview: React.FC<CoverLetterPreviewProps> = ({
  coverLetter,
  companyName,
  roleTitle,
  jobDescription,
  resumeText,
  onUpdateCoverLetter,
  onOpenApiKeyModal,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<"preview" | "alignment" | "edit">("preview");
  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [selectedTone, setSelectedTone] = useState<"concise" | "balanced" | "assertive" | "enthusiastic">("balanced");
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>("gemini-3.8-flash");
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Local editable state
  const [editableLetter, setEditableLetter] = useState<CoverLetterData>(coverLetter);

  const handleCopyText = () => {
    navigator.clipboard.writeText(coverLetter.fullLetterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      const sanitizedCompany = companyName.replace(/\s+/g, "_") || "Company";
      await exportCoverLetterToDocx(coverLetter, `${sanitizedCompany}_Cover_Letter.docx`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    const sanitizedCompany = companyName.replace(/\s+/g, "_") || "Company";
    try {
      await exportCoverLetterToPdf(coverLetter, `${sanitizedCompany}_Cover_Letter.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
    }
  };

  const handleRegenerateTone = async (tone: "concise" | "balanced" | "assertive" | "enthusiastic") => {
    setSelectedTone(tone);
    setIsRegenerating(true);

    try {
      const regenerated = await generateCoverLetter(user?.uid, {
        resumeText,
        jobDescription,
        roleTitle,
        companyName,
        tone,
        applicantName: coverLetter.applicant?.name || "Applicant",
        model: selectedModel,
      });
      onUpdateCoverLetter(regenerated);
      setEditableLetter(regenerated);
    } catch (err: any) {
      console.error("Cover letter regeneration error:", err);
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
        message: err?.message || "Failed to regenerate cover letter.",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveEdits = () => {
    // Rebuild full letter text
    const full = [
      editableLetter.salutation,
      "",
      editableLetter.openingParagraph,
      "",
      ...editableLetter.bodyParagraphs,
      "",
      editableLetter.closingParagraph,
      "",
      editableLetter.signOff,
      editableLetter.applicant?.name || "Sincerely",
    ].join("\n");

    const updated = {
      ...editableLetter,
      fullLetterText: full,
    };
    onUpdateCoverLetter(updated);
    setViewMode("preview");
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
        {/* Sub-view switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${
              viewMode === "preview"
                ? "bg-white text-slate-800 shadow-xs font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Letter Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("alignment")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${
              viewMode === "alignment"
                ? "bg-white text-slate-800 shadow-xs font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Requirement Alignment</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all ${
              viewMode === "edit"
                ? "bg-white text-slate-800 shadow-xs font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Edit Letter</span>
          </button>
        </div>

        {/* Export & Copy buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? "Copied!" : "Copy Text"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-md transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export DOCX</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Tone & Model Switcher Banner */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI Model:</span>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as GeminiModelId)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.tag})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-medium">Regenerate Tone:</span>
          <div className="flex items-center gap-1.5">
            {(["concise", "balanced", "assertive", "enthusiastic"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleRegenerateTone(t)}
                disabled={isRegenerating}
                className={`px-2.5 py-1 rounded-md capitalize text-xs font-medium transition-all cursor-pointer ${
                  selectedTone === t
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {isRegenerating && selectedTone === t ? (
                  <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                ) : null}
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. Letter Formatted Preview */}
      {viewMode === "preview" && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-14 shadow-sm max-w-3xl mx-auto font-serif font-['Times_New_Roman',_Times,_serif] leading-relaxed text-slate-900 space-y-6">
          {/* Applicant Header */}
          {coverLetter.applicant && (
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight font-serif font-['Times_New_Roman',_Times,_serif]">
                {coverLetter.applicant.name}
              </h2>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                {coverLetter.applicant.email && <span>{coverLetter.applicant.email}</span>}
                {coverLetter.applicant.phone && <span>• {coverLetter.applicant.phone}</span>}
                {coverLetter.applicant.location && <span>• {coverLetter.applicant.location}</span>}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="text-xs sm:text-sm text-slate-600 font-medium font-serif font-['Times_New_Roman',_Times,_serif]">
            {getFormattedCoverLetterDate(coverLetter.date)}
          </div>

          {/* Recipient */}
          <div className="text-xs sm:text-sm text-slate-800 space-y-0.5 font-serif font-['Times_New_Roman',_Times,_serif]">
            <div className="font-bold text-slate-950">
              {coverLetter.recipient.hiringManagerTitle || "Hiring Team"}
            </div>
            <div>{coverLetter.recipient.company}</div>
            {coverLetter.recipient.department && <div>{coverLetter.recipient.department}</div>}
          </div>

          {/* Salutation */}
          <div className="font-bold text-xs sm:text-sm text-slate-900 pt-2 font-serif font-['Times_New_Roman',_Times,_serif]">
            {coverLetter.salutation}
          </div>

          {/* Opening Hook */}
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed text-justify font-serif font-['Times_New_Roman',_Times,_serif]">
            {coverLetter.openingParagraph}
          </p>

          {/* Body Paragraphs */}
          <div className="space-y-4">
            {coverLetter.bodyParagraphs.map((para, idx) => (
              <p key={idx} className="text-xs sm:text-sm text-slate-800 leading-relaxed text-justify font-serif font-['Times_New_Roman',_Times,_serif]">
                {para}
              </p>
            ))}
          </div>

          {/* Closing */}
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed text-justify font-serif font-['Times_New_Roman',_Times,_serif]">
            {coverLetter.closingParagraph}
          </p>

          {/* Sign Off */}
          <div className="pt-4 space-y-3 font-serif font-['Times_New_Roman',_Times,_serif]">
            <div className="text-xs sm:text-sm text-slate-800">
              {sanitizeSignOff(coverLetter.signOff, coverLetter.applicant?.name)}
            </div>
            <div className="text-sm font-bold text-slate-950 font-serif font-['Times_New_Roman',_Times,_serif]">
              {coverLetter.applicant?.name || "Applicant"}
            </div>
          </div>
        </div>
      )}

      {/* 2. Job Requirement Alignment Grid */}
      {viewMode === "alignment" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Company Requirements Alignment Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Direct mapping showing how your background addresses the hiring team's explicit priorities
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {coverLetter.keyMatchesHighlighted?.map((match, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 shrink-0 mt-0.5">
                    Job Requirement
                  </span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    {match.jobRequirement}
                  </p>
                </div>
                <div className="flex items-start gap-2 pl-4 border-l-2 border-emerald-500 mt-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">
                      Candidate Evidence in Letter:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {match.addressedHow}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. In-Place Edit Mode */}
      {viewMode === "edit" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit Cover Letter</h3>
              <p className="text-xs text-slate-500">Tweak any paragraph directly before exporting or sending.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveEdits}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
            >
              Save Edits
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Salutation</label>
            <input
              type="text"
              value={editableLetter.salutation}
              onChange={(e) => setEditableLetter({ ...editableLetter, salutation: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Opening Paragraph</label>
            <textarea
              rows={3}
              value={editableLetter.openingParagraph}
              onChange={(e) => setEditableLetter({ ...editableLetter, openingParagraph: e.target.value })}
              className="w-full p-3 border border-slate-300 rounded-lg text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800">Body Paragraphs</label>
            {editableLetter.bodyParagraphs.map((body, idx) => (
              <textarea
                key={idx}
                rows={4}
                value={body}
                onChange={(e) => {
                  const updatedBody = [...editableLetter.bodyParagraphs];
                  updatedBody[idx] = e.target.value;
                  setEditableLetter({ ...editableLetter, bodyParagraphs: updatedBody });
                }}
                className="w-full p-3 border border-slate-300 rounded-lg text-xs leading-relaxed"
              />
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Closing Paragraph</label>
            <textarea
              rows={3}
              value={editableLetter.closingParagraph}
              onChange={(e) => setEditableLetter({ ...editableLetter, closingParagraph: e.target.value })}
              className="w-full p-3 border border-slate-300 rounded-lg text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-3 border-t">
            <button
              type="button"
              onClick={handleSaveEdits}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Save & Update Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
