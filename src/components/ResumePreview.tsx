import React, { useState } from "react";
import { 
  Download, 
  FileText, 
  Copy, 
  Check, 
  Columns, 
  Edit3, 
  Eye, 
  Layout
} from "lucide-react";
import { TailoredResume, TailoringChange } from "../types";
import { exportResumeToDocx, exportResumeToPdf } from "../utils/exports";
import { formatEducationDetails } from "../utils/masterProfile";

interface ResumePreviewProps {
  tailoredResume: TailoredResume;
  originalResume: string;
  tailoringChanges?: TailoringChange[];
  templateUsed?: string;
  onUpdateResume: (updated: TailoredResume) => void;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({
  tailoredResume,
  originalResume,
  tailoringChanges,
  templateUsed,
  onUpdateResume,
}) => {
  const [viewMode, setViewMode] = useState<"formatted" | "diff" | "edit">("formatted");
  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Normalize initial template
  const getInitialFormat = (tpl?: string) => {
    const t = (tpl || "").toLowerCase();
    if (t.includes("tech") || t.includes("engineering")) return "modern-tech";
    if (t.includes("executive") || t.includes("leadership")) return "executive-leadership";
    return "harvard-classic";
  };

  const [activeFormat, setActiveFormat] = useState<string>(() => getInitialFormat(templateUsed));

  // Local editable state
  const [editState, setEditState] = useState<TailoredResume>(tailoredResume);

  const handleCopyText = () => {
    const lines: string[] = [];
    const r = tailoredResume;

    lines.push(r.contactInfo.fullName.toUpperCase());
    if (r.contactInfo.title) lines.push(r.contactInfo.title);
    const c = [r.contactInfo.email, r.contactInfo.phone, r.contactInfo.location, r.contactInfo.linkedin, r.contactInfo.portfolio].filter(Boolean);
    lines.push(c.join(" | "));
    lines.push("\nPROFESSIONAL SUMMARY\n" + r.summary);

    if (r.skillsCategories && r.skillsCategories.length > 0) {
      lines.push("\nCORE COMPETENCIES & TECHNICAL SKILLS");
      r.skillsCategories.forEach(cat => {
        lines.push(`${cat.category}: ${cat.skills.join(", ")}`);
      });
    }

    if (r.experience && r.experience.length > 0) {
      lines.push("\nPROFESSIONAL EXPERIENCE");
      r.experience.forEach(exp => {
        const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
        lines.push(`\n${exp.role} | ${exp.company} | ${dates}`);
        exp.bullets.forEach(b => lines.push(`• ${b}`));
      });
    }

    if (r.education && r.education.length > 0) {
      lines.push("\nEDUCATION");
      r.education.forEach(edu => {
        const yr = edu.graduationYear ? ` (${edu.graduationYear})` : "";
        lines.push(`${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""} - ${edu.institution}${yr}`);
        const details = formatEducationDetails(edu);
        if (details) lines.push(details);
      });
    }

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      const sanitizedName = tailoredResume.contactInfo.fullName.replace(/\s+/g, "_") || "Tailored";
      await exportResumeToDocx(tailoredResume, `${sanitizedName}_ATS_Resume.docx`);
    } catch (err) {
      console.error("DOCX Export error:", err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    const sanitizedName = tailoredResume.contactInfo.fullName.replace(/\s+/g, "_") || "Tailored";
    try {
      await exportResumeToPdf(tailoredResume, `${sanitizedName}_ATS_Resume.pdf`, activeFormat);
    } catch (err) {
      console.error("PDF Export error:", err);
    }
  };

  const handleSaveEdits = () => {
    onUpdateResume(editState);
    setViewMode("formatted");
  };

  // Sections
  const renderContactBar = (centered = true) => (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 ${centered ? "justify-center" : "justify-start"} mt-1.5`}>
      {tailoredResume.contactInfo.email && <span>{tailoredResume.contactInfo.email}</span>}
      {tailoredResume.contactInfo.phone && <span>• {tailoredResume.contactInfo.phone}</span>}
      {tailoredResume.contactInfo.location && <span>• {tailoredResume.contactInfo.location}</span>}
      {tailoredResume.contactInfo.linkedin && <span>• {tailoredResume.contactInfo.linkedin}</span>}
      {tailoredResume.contactInfo.portfolio && <span>• {tailoredResume.contactInfo.portfolio}</span>}
    </div>
  );

  const renderSummarySection = (title = "Professional Summary") => {
    if (!tailoredResume.summary) return null;
    return (
      <div className="mt-5">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed text-justify">
          {tailoredResume.summary}
        </p>
      </div>
    );
  };

  const renderSkillsSection = (title = "Technical Skills & Competencies", _asBadges = false) => {
    if (!tailoredResume.skillsCategories || tailoredResume.skillsCategories.length === 0) return null;
    return (
      <div className="mt-5">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
          {title}
        </h2>
        <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
          {tailoredResume.skillsCategories.map((cat, idx) => (
            <div key={idx} className="flex flex-wrap items-baseline gap-x-1.5 text-slate-800">
              <span className="font-bold text-slate-950 font-serif font-['Times_New_Roman',_Times,_serif]">
                {cat.category}:
              </span>
              <span className="text-slate-800 font-serif font-['Times_New_Roman',_Times,_serif]">
                {cat.skills.join(", ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderExperienceSection = (showTechBadges = false) => {
    if (!tailoredResume.experience || tailoredResume.experience.length === 0) return null;
    return (
      <div className="mt-5">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
          Professional Experience
        </h2>
        <div className="space-y-4">
          {tailoredResume.experience.map((exp, idx) => (
            <div key={idx}>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5">
                <div className="font-bold text-xs sm:text-sm text-slate-900">
                  {exp.role} <span className="font-normal text-slate-700">– {exp.company}</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500">
                  {[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}
                  {exp.location && ` | ${exp.location}`}
                </div>
              </div>

              <ul className="mt-1.5 space-y-1 list-disc list-outside pl-4 text-xs sm:text-sm text-slate-800">
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className="leading-relaxed">
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEducationSection = () => {
    if (!tailoredResume.education || tailoredResume.education.length === 0) return null;
    return (
      <div className="mt-5">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
          Education
        </h2>
        <div className="space-y-2 text-xs sm:text-sm">
          {tailoredResume.education.map((edu, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5">
              <div>
                <span className="font-bold text-slate-900">
                  {edu.degree}
                  {edu.fieldOfStudy && ` in ${edu.fieldOfStudy}`}
                </span>
                <span className="text-slate-700"> – {edu.institution}</span>
                {formatEducationDetails(edu) && (
                  <span className="italic text-slate-500 ml-1 text-xs">
                    ({formatEducationDetails(edu)})
                  </span>
                )}
              </div>
              {edu.graduationYear && (
                <span className="text-[11px] sm:text-xs text-slate-500">
                  {edu.graduationYear}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProjectsSection = (techStyle = false) => {
    if (!tailoredResume.projects || tailoredResume.projects.length === 0) return null;
    return (
      <div className="mt-5">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
          Key Projects
        </h2>
        <div className="space-y-3">
          {tailoredResume.projects.map((proj, idx) => (
            <div key={idx} className="text-xs sm:text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-bold text-slate-900">{proj.name}</span>
                {proj.technologies && (
                  <span className="text-[11px] text-slate-500 font-serif font-['Times_New_Roman',_Times,_serif]">
                    [{proj.technologies.join(", ")}]
                  </span>
                )}
              </div>
              <p className="text-slate-800 mt-0.5 leading-relaxed">{proj.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCertificationsSection = () => {
    if (!tailoredResume.certifications || tailoredResume.certifications.length === 0) return null;
    return (
      <div className="mt-5">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
          Certifications
        </h2>
        <ul className="list-disc list-outside pl-4 text-xs sm:text-sm text-slate-800 space-y-1">
          {tailoredResume.certifications.map((cert, idx) => (
            <li key={idx}>{cert}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-white border border-slate-200 rounded-lg">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => setViewMode("formatted")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              viewMode === "formatted"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Formatted</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("diff")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              viewMode === "diff"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Diff</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("edit")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              viewMode === "edit"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>

        {/* Center: Live Format Selector */}
        {viewMode === "formatted" && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Layout className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline text-slate-500">Format:</span>
            <select
              value={activeFormat}
              onChange={(e) => setActiveFormat(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="harvard-classic">Harvard Classic (Ivy League)</option>
              <option value="modern-tech">Modern Tech & Engineering</option>
              <option value="executive-leadership">Executive Leadership C-Suite</option>
            </select>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors cursor-pointer"
            title="Copy ATS text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>DOCX</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* 1. Formatted Preview - Distinct Layouts Per Template (All Times New Roman) */}
      {viewMode === "formatted" && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-8 md:p-12 max-w-4xl mx-auto shadow-2xs break-words font-serif font-['Times_New_Roman',_Times,_serif]">
          
          {/* A. Harvard / Ivy League Classic Layout */}
          {activeFormat === "harvard-classic" && (
            <div className="font-serif font-['Times_New_Roman',_Times,_serif] text-slate-900 leading-relaxed">
              {/* Centered all-caps Header */}
              <div className="text-center pb-4 border-b border-slate-800">
                <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-slate-950 font-serif font-['Times_New_Roman',_Times,_serif]">
                  {tailoredResume.contactInfo.fullName}
                </h1>
                {tailoredResume.contactInfo.title && (
                  <div className="text-xs font-serif font-['Times_New_Roman',_Times,_serif] text-slate-700 mt-1">
                    {tailoredResume.contactInfo.title}
                  </div>
                )}
                {renderContactBar(true)}
              </div>

              {/* In Harvard Classic: Education sits proudly first */}
              {renderEducationSection()}
              {renderExperienceSection(false)}
              {renderProjectsSection(false)}
              {renderSkillsSection("Technical Skills & Interests", false)}
              {renderCertificationsSection()}
            </div>
          )}

          {/* B. Modern Tech & Engineering Layout */}
          {activeFormat === "modern-tech" && (
            <div className="font-serif font-['Times_New_Roman',_Times,_serif] text-slate-900 leading-relaxed">
              {/* Modern Left-Aligned Header */}
              <div className="pb-4 border-b-2 border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-serif font-['Times_New_Roman',_Times,_serif]">
                    {tailoredResume.contactInfo.fullName}
                  </h1>
                  {tailoredResume.contactInfo.title && (
                    <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-600 font-serif font-['Times_New_Roman',_Times,_serif]">
                      {tailoredResume.contactInfo.title}
                    </span>
                  )}
                </div>
                {renderContactBar(false)}
              </div>

              {/* In Modern Tech: Technical Skills Matrix sits first at the top */}
              {renderSkillsSection("Technical Skills Matrix")}
              {renderExperienceSection(true)}
              {renderProjectsSection(true)}
              {renderEducationSection()}
              {renderCertificationsSection()}
            </div>
          )}

          {/* C. Executive & Leadership C-Suite Layout */}
          {activeFormat === "executive-leadership" && (
            <div className="font-serif font-['Times_New_Roman',_Times,_serif] text-slate-900 leading-relaxed">
              {/* Executive Left Accent Banner */}
              <div className="border-l-4 border-slate-900 pl-4 py-1 pb-3 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-serif font-['Times_New_Roman',_Times,_serif]">
                  {tailoredResume.contactInfo.fullName}
                </h1>
                {tailoredResume.contactInfo.title && (
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-1 font-serif font-['Times_New_Roman',_Times,_serif]">
                    {tailoredResume.contactInfo.title}
                  </div>
                )}
                {renderContactBar(false)}
              </div>

              {/* Executive Value Proposition */}
              {renderSummarySection("Executive Value Proposition")}

              {/* Core Leadership Competencies */}
              {renderSkillsSection("Core Leadership Competencies")}

              {/* Executive Experience */}
              {renderExperienceSection(false)}

              {/* Strategic Projects / Initiatives */}
              {renderProjectsSection(false)}

              {/* Education & Credentials */}
              {renderEducationSection()}
              {renderCertificationsSection()}
            </div>
          )}

        </div>
      )}

      {/* 2. Side-by-Side Diff View */}
      {viewMode === "diff" && (
        <div className="space-y-4">
          {tailoringChanges && tailoringChanges.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-xs font-bold text-slate-900 mb-2">
                Tailoring Optimization Highlights
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                {tailoringChanges.map((ch, idx) => (
                  <div key={idx} className="p-2 bg-white border border-slate-200 rounded">
                    <div className="font-semibold text-slate-900 mb-0.5">{ch.section}</div>
                    <div className="text-slate-700">{ch.change}</div>
                    <div className="text-[11px] text-slate-500 mt-1 italic">{ch.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-xs font-bold uppercase text-slate-500 pb-2 mb-2 border-b border-slate-200">
                Original Input Resume
              </h3>
              <pre className="text-xs font-serif font-['Times_New_Roman',_Times,_serif] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                {originalResume || "No original resume text available."}
              </pre>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <h3 className="text-xs font-bold uppercase text-slate-900 pb-2 mb-2 border-b border-slate-200">
                Tailored ATS Version
              </h3>
              <pre className="text-xs font-serif font-['Times_New_Roman',_Times,_serif] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                {JSON.stringify(tailoredResume, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 3. In-Place Edit Mode */}
      {viewMode === "edit" && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Edit Tailored Resume Fields
            </h3>
            <button
              type="button"
              onClick={handleSaveEdits}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
            >
              Save & Apply
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={editState.contactInfo.fullName}
                onChange={(e) =>
                  setEditState({
                    ...editState,
                    contactInfo: { ...editState.contactInfo, fullName: e.target.value },
                  })
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Role Title</label>
              <input
                type="text"
                value={editState.contactInfo.title}
                onChange={(e) =>
                  setEditState({
                    ...editState,
                    contactInfo: { ...editState.contactInfo, title: e.target.value },
                  })
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Professional Summary</label>
              <textarea
                rows={4}
                value={editState.summary}
                onChange={(e) => setEditState({ ...editState, summary: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
