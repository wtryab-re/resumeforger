import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  X, 
  Key, 
  ArrowRight
} from "lucide-react";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number; // ms
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    // Default duration: 6s for errors and normal toasts, 10s with action
    const duration = options.duration ?? (options.actionLabel ? 10000 : 6000);

    setToasts((prev) => {
      // Deduplicate: If an active toast already has the exact same message and title, do not duplicate it
      const alreadyExists = prev.some(
        (t) => t.message === options.message && t.title === options.title
      );
      if (alreadyExists) {
        return prev;
      }
      // Remove any existing toast with the same id to prevent duplicate stack
      const filtered = prev.filter((t) => t.id !== id);
      return [...filtered, { ...options, id }];
    });

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast Render Container */}
      <div 
        aria-live="assertive" 
        className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-md sm:max-w-lg w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const isApiKeyWarning = toast.actionLabel?.toLowerCase().includes("key") || toast.title.toLowerCase().includes("key");

          const typeStyles = {
            info: "bg-white border-slate-200 text-slate-800 shadow-md",
            success: "bg-white border-emerald-200 text-slate-800 shadow-md",
            warning: "bg-white border-amber-200 text-slate-800 shadow-md",
            error: "bg-white border-rose-200 text-slate-800 shadow-md",
          }[toast.type || "info"];

          const iconColor = {
            info: "text-sky-600 bg-sky-50",
            success: "text-emerald-600 bg-emerald-50",
            warning: "text-amber-600 bg-amber-50",
            error: "text-rose-600 bg-rose-50",
          }[toast.type || "info"];

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto rounded-lg border p-3 transition-all animate-in slide-in-from-top-2 fade-in duration-150 ${typeStyles}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-md shrink-0 ${iconColor}`}>
                  {isApiKeyWarning ? (
                    <Key className="w-4 h-4 text-amber-600" />
                  ) : toast.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : toast.type === "warning" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : toast.type === "error" ? (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-900">
                      {toast.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => dismissToast(toast.id)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                      aria-label="Close notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs mt-0.5 leading-normal text-slate-600 break-words">
                    {toast.message}
                  </p>

                  {toast.actionLabel && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          toast.onAction?.();
                          dismissToast(toast.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Key className="w-3 h-3" />
                        <span>{toast.actionLabel}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => dismissToast(toast.id)}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
