import React from "react";
import { Check, AlertCircle } from "lucide-react";
import { AtsAnalysis } from "../types";

interface AtsScannerViewProps {
  analysis?: AtsAnalysis;
}

export const AtsScannerView: React.FC<AtsScannerViewProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-xs text-slate-500">
        No ATS analysis data available for this application yet.
      </div>
    );
  }

  const {
    overallScore = 0,
    matchRate = 0,
    matchedKeywords = [],
    missingKeywords = [],
    criticalSkills = { hardSkills: [], softSkills: [] },
    scannerTips = [],
    strengths = [],
    recommendations = [],
  } = analysis;

  return (
    <div className="space-y-4">
      {/* 1. Score Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Overall ATS Score */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Overall ATS Score
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {overallScore}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
            <span className="text-xs font-medium text-slate-600 ml-auto">
              {overallScore >= 80 ? "Strong Match" : overallScore >= 65 ? "Moderate Match" : "Review Needed"}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-slate-900 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, overallScore))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Automated screening alignment based on role keywords, skills, and structure.
          </p>
        </div>

        {/* Job Match Rate */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Job Match Rate
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {matchRate}%
            </span>
            <span className="text-xs text-slate-600 ml-auto font-medium">
              {matchedKeywords.length} Matched Keywords
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-slate-900 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, matchRate))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Percentage of target job qualifications present in your tailored resume.
          </p>
        </div>
      </div>

      {/* 2. Key Skills */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Skills Highlighted for this Role
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Hard Skills */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
            <div className="text-xs font-semibold text-slate-800">
              Technical & Domain Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {criticalSkills.hardSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-white border border-slate-200 text-slate-800 rounded text-[11px]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Soft Skills */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
            <div className="text-xs font-semibold text-slate-800">
              Leadership & Core Competencies
            </div>
            <div className="flex flex-wrap gap-1.5">
              {criticalSkills.softSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-white border border-slate-200 text-slate-800 rounded text-[11px]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Keywords Breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Keyword Match Analysis
        </h3>

        {/* Matched */}
        <div>
          <div className="text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-slate-700" />
            <span>Matched Keywords ({matchedKeywords.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedKeywords.map((kw, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded text-[11px]"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Missing */}
        {missingKeywords.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Missing from Resume ({missingKeywords.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-slate-50 border border-dashed border-slate-300 text-slate-600 rounded text-[11px]"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Scanner Tips */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          ATS Screening Tips & Compliance
        </h3>

        <div className="space-y-2">
          {scannerTips.map((tip, idx) => (
            <div 
              key={idx} 
              className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs flex items-start gap-2.5"
            >
              <div className="mt-0.5 shrink-0 text-slate-600">
                {tip.isSatisfied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {tip.category}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {tip.impact} impact
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  {tip.tip}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Strengths & Recommendations */}
      {(strengths?.length > 0 || recommendations?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {strengths?.length > 0 && (
            <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Identified Strengths
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span className="leading-relaxed">{str}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations?.length > 0 && (
            <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Recommendations
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
