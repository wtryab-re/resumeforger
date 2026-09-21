import React, { useState } from "react";
import { 
  LayoutTemplate, 
  Check, 
  Sparkles, 
  ChevronDown, 
  ChevronUp
} from "lucide-react";
import { 
  ResumeTemplate, 
  BUILTIN_RESUME_TEMPLATES, 
  saveStoredTemplateId
} from "../data/resumeTemplates";

interface ResumeTemplateSelectorProps {
  selectedTemplate: ResumeTemplate;
  onSelectTemplate: (template: ResumeTemplate) => void;
  onRequireApiKey?: () => void;
}

export const ResumeTemplateSelector: React.FC<ResumeTemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate,
}) => {
  const [showBlueprintPreview, setShowBlueprintPreview] = useState(false);

  const handleSelectBuiltin = (tpl: ResumeTemplate) => {
    onSelectTemplate(tpl);
    saveStoredTemplateId(tpl.id);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <LayoutTemplate className="w-3.5 h-3.5 text-slate-600" />
          <span>Resume Template Format</span>
        </label>
        <span className="text-[11px] text-slate-500 font-serif font-['Times_New_Roman',_Times,_serif]">
          Times New Roman Formatted
        </span>
      </div>

      {/* Built-in Templates Selection */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {BUILTIN_RESUME_TEMPLATES.map((tpl) => {
            const isSelected = selectedTemplate.id === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectBuiltin(tpl)}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {tpl.name}
                    </span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {tpl.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Template Confirmation Banner */}
      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-slate-700 shrink-0" />
          <div className="text-xs truncate">
            <span className="text-slate-500">Selected Template: </span>
            <strong className="font-semibold text-slate-900">{selectedTemplate.name}</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBlueprintPreview(!showBlueprintPreview)}
          className="text-[11px] font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <span>{showBlueprintPreview ? "Hide Rules" : "Inspect Rules"}</span>
          {showBlueprintPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expandable Rules / Blueprint Inspector */}
      {showBlueprintPreview && (
        <div className="p-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs space-y-2 font-mono">
          <div className="text-[11px] text-slate-900 font-bold uppercase tracking-wider">
            Template Guidelines for {selectedTemplate.name}:
          </div>
          <div className="space-y-1 text-slate-600 text-[11px]">
            {selectedTemplate.rules?.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-600 shrink-0">✓</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
          {selectedTemplate.content && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 whitespace-pre-wrap max-h-36 overflow-y-auto font-serif font-['Times_New_Roman',_Times,_serif]">
              {selectedTemplate.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
