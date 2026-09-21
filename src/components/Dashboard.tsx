import React, { useState } from "react";
import { 
  Search, 
  Plus, 
  Trash2,
  FileText
} from "lucide-react";
import { JobApplication, MasterProfile } from "../types";
import { exportResumeToDocx, exportResumeToPdf } from "../utils/exports";

interface DashboardProps {
  applications: JobApplication[];
  onSelectApplication: (app: JobApplication) => void;
  onOpenNewModal: () => void;
  onDeleteApplication: (id: string) => void;
  masterProfile: MasterProfile;
  onNavigateToProfile: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  applications,
  onSelectApplication,
  onOpenNewModal,
  onDeleteApplication,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "score" | "company">("updated");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filtered & Sorted
  const filteredApps = applications.filter((app) => {
    const q = searchQuery.toLowerCase();
    return (
      app.company.toLowerCase().includes(q) ||
      app.roleTitle.toLowerCase().includes(q) ||
      (app.templateUsed && app.templateUsed.toLowerCase().includes(q))
    );
  }).sort((a, b) => {
    if (sortBy === "score") {
      return (b.atsAnalysis?.overallScore || 0) - (a.atsAnalysis?.overallScore || 0);
    }
    if (sortBy === "company") {
      return a.company.localeCompare(b.company);
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteApplication(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-5">
      {/* Simple Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Resumes & Cover Letters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tailored applications grounded in your authentic profile
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tailor New Resume</span>
          </button>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company or role..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none cursor-pointer text-xs"
            >
              <option value="updated">Recent</option>
              <option value="score">ATS Match</option>
              <option value="company">Company</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumes List */}
      {filteredApps.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div className="w-10 h-10 rounded bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {searchQuery ? "No matching resumes found" : "No tailored resumes yet"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery 
              ? "Try adjusting your search terms." 
              : "Paste a target job description to create your first tailored resume and cover letter."}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onOpenNewModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tailor Resume</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredApps.map((app) => {
            const isConfirming = confirmDeleteId === app.id;
            const score = app.atsAnalysis?.overallScore;

            return (
              <div
                key={app.id}
                onClick={() => onSelectApplication(app)}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 p-4 flex flex-col justify-between transition-colors cursor-pointer"
              >
                <div>
                  {/* Top line: Company & ATS score */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {app.company}
                    </span>
                    {score !== undefined && (
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {score}% Match
                      </span>
                    )}
                  </div>

                  {/* Role title */}
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 break-words">
                    {app.roleTitle}
                  </h3>

                  {/* Template & Status info */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-2">
                    {app.templateUsed && (
                      <span>{app.templateUsed}</span>
                    )}
                    {app.templateUsed && app.coverLetter && <span>•</span>}
                    {app.coverLetter && (
                      <span>Cover Letter Included</span>
                    )}
                    <span>•</span>
                    <span>{new Date(app.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Card Actions Bar */}
                <div 
                  className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onSelectApplication(app)}
                    className="text-xs font-medium text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    Open
                  </button>

                  <div className="flex items-center gap-1.5">
                    {app.tailoredResume && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void exportResumeToPdf(app.tailoredResume!, `${app.company}_Resume.pdf`, app.templateUsed).catch(console.error);
                          }}
                          className="px-2 py-0.5 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Export PDF"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void exportResumeToDocx(app.tailoredResume!, `${app.company}_Resume.docx`).catch(console.error);
                          }}
                          className="px-2 py-0.5 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Export DOCX"
                        >
                          DOCX
                        </button>
                      </>
                    )}

                    {/* Working Delete Button with Inline Confirmation */}
                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(app.id, e)}
                          className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={cancelDelete}
                          className="px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(app.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Delete resume"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
