import React from "react";
import { Check } from "lucide-react";
import {
  AVAILABLE_MODELS,
  FALLBACK_MODEL_NAME,
  type GeminiModelId,
  type ModelOption,
} from "../data/models";

export { AVAILABLE_MODELS };
export type { GeminiModelId, ModelOption };

/** @deprecated Import AVAILABLE_MODELS from ../data/models instead. */
export const GEMINI_MODELS = AVAILABLE_MODELS;

interface ModelSelectorProps {
  selectedModel: GeminiModelId;
  onChangeModel: (model: GeminiModelId) => void;
  compact?: boolean;
  label?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onChangeModel,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = selectedModel === model.id;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onChangeModel(model.id)}
              className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                isSelected
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 leading-tight truncate">
                  {model.name.replace("Gemini ", "")}
                </span>
                {isSelected && <Check className="w-3 h-3 text-slate-900 shrink-0" />}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {model.tag}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = selectedModel === model.id;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onChangeModel(model.id)}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="font-bold text-xs text-slate-900">
                    {model.name}
                  </div>
                  {isSelected ? (
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  ) : model.isRecommended ? (
                    <span className="text-[9px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  ) : null}
                </div>
                <div className="inline-block mb-1.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${model.badgeColor}`}>
                    {model.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                  {model.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-500 pt-0.5">
        Automatic fallback: <strong className="font-semibold text-slate-700">{FALLBACK_MODEL_NAME}</strong> (retried once if the primary model is temporarily unavailable)
      </div>
    </div>
  );
};
