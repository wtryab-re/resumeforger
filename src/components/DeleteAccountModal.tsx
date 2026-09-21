import React, { useState } from "react";
import { AlertTriangle, X, Trash2, Loader2, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password?: string) => Promise<void>;
  isDeleting: boolean;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  if (!isOpen) return null;

  const isPasswordUser = user?.providerData.some(
    (p) => p.providerId === "password"
  );

  const handleConfirmClick = async () => {
    // If the user registered via email & password, require password confirmation
    if (isPasswordUser && !password.trim()) {
      setShowPasswordInput(true);
      return;
    }
    await onConfirm(password);
  };

  const handleClose = () => {
    if (isDeleting) return;
    setPassword("");
    setShowPasswordInput(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-rose-50 border-b border-rose-100">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-bold text-sm tracking-wide text-rose-900">
              DANGER ZONE
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-white/80 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700 font-medium leading-relaxed">
            Are you sure you want to delete your account along with all its data?
          </p>

          <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-lg text-xs text-rose-800 space-y-1">
            <p className="font-semibold text-rose-900">This action is permanent and irreversible:</p>
            <ul className="list-disc list-inside space-y-0.5 text-rose-700">
              <li>Your Master Profile and custom fields will be erased</li>
              <li>All tailored resumes, ATS scores, and cover letters will be deleted</li>
              <li>Your login account will be permanently closed</li>
            </ul>
          </div>

          {/* Password re-auth prompt for email accounts */}
          {isPasswordUser && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Confirm your password to authorize deletion:</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter current account password"
                disabled={isDeleting}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-hidden focus:ring-2 transition-all ${
                  showPasswordInput && !password.trim()
                    ? "border-rose-400 focus:ring-rose-200"
                    : "border-slate-300 focus:border-rose-500 focus:ring-rose-200"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password.trim()) {
                    handleConfirmClick();
                  }
                }}
              />
              {showPasswordInput && !password.trim() && (
                <p className="text-[11px] text-rose-600 font-medium">
                  Please enter your password to confirm account deletion.
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isDeleting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Account...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
