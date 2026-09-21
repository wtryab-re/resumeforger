import React, { useState, useEffect } from "react";
import { 
  Key, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Trash2, 
  X,
  Lock
} from "lucide-react";
import { 
  saveEncryptedApiKey, 
  getDecryptedApiKey, 
  clearEncryptedApiKey, 
  hasCustomEncryptedApiKey,
  maskApiKey 
} from "../utils/crypto";
import { testApiKey } from "../utils/api";
import { useToast } from "./Toast";
import { useAuth } from "../context/AuthContext";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedMaskedKey, setSavedMaskedKey] = useState<string | null>(null);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCurrentKeyState();
      setTestResult(null);
    }
  }, [isOpen, user?.uid]);

  const loadCurrentKeyState = async () => {
    const customExists = hasCustomEncryptedApiKey(user?.uid);
    setHasCustomKey(customExists);
    if (customExists) {
      const decrypted = await getDecryptedApiKey(user?.uid);
      if (decrypted) {
        setSavedMaskedKey(maskApiKey(decrypted));
      } else {
        setSavedMaskedKey(null);
      }
    } else {
      setSavedMaskedKey(null);
    }
  };

  const handleTestKey = async (keyToTest?: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const key = keyToTest || apiKeyInput.trim() || (await getDecryptedApiKey(user?.uid)) || "";
      if (!key) {
        setTestResult({
          success: false,
          message: "Please enter a Gemini API key first to test.",
        });
        setIsTesting(false);
        return;
      }
      const data = await testApiKey(key);
      setTestResult({
        success: true,
        message: `Connected successfully to ${data.model}! Ready for resume tailoring.`,
      });
      showToast({
        type: "success",
        title: "API Key Validated",
        message: `Connected successfully to ${data.model}.`,
      });
    } catch (err: any) {
      const errMsg = err?.message || "Network error while validating key.";
      setTestResult({
        success: false,
        message: errMsg,
      });
      showToast({
        type: "error",
        title: "Gemini Model Error",
        message: errMsg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setIsSaving(true);
    const success = await saveEncryptedApiKey(apiKeyInput.trim(), user?.uid);
    setIsSaving(false);

    if (success) {
      await loadCurrentKeyState();
      setApiKeyInput("");
      onKeyUpdated();
      // Run quick validation
      handleTestKey();
    } else {
      setTestResult({
        success: false,
        message: "Failed to encrypt and store API key. Web Crypto API required.",
      });
    }
  };

  const handleClearKey = () => {
    if (window.confirm("Are you sure you want to remove your encrypted API key from this browser?")) {
      clearEncryptedApiKey(user?.uid);
      setSavedMaskedKey(null);
      setHasCustomKey(false);
      setApiKeyInput("");
      setTestResult(null);
      onKeyUpdated();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Google AI Studio API Key
              </h3>
              <p className="text-xs text-slate-500">
                Encrypted with AES-GCM 256-bit in local storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Security Notice */}
          <div className="flex items-start gap-3 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-emerald-950">
                Hardware-backed Client Encryption
              </span>
              <p className="text-emerald-800 leading-relaxed">
                Your API key is encrypted using browser Web Crypto (PBKDF2 + AES-GCM 256-bit) before writing to local storage. It is only decrypted when making model requests to Google AI Studio.
              </p>
            </div>
          </div>

          {/* Current Active Key Status */}
          {hasCustomKey && savedMaskedKey && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Lock className="w-3.5 h-3.5 text-slate-700" />
                  <span>Custom Encrypted Key Active</span>
                </div>
                <div className="font-mono text-xs font-medium text-slate-800 mt-1">
                  {savedMaskedKey}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestKey()}
                  disabled={isTesting}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test Key"}
                </button>
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remove Key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Key Input Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {hasCustomKey ? "Update or Replace API Key" : "Enter Your Gemini API Key"}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                  testResult.success
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : "bg-rose-50 text-rose-900 border-rose-200"
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{testResult.message}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-1">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 underline font-medium"
              >
                <span>Get API key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                {apiKeyInput.trim() && (
                  <button
                    type="button"
                    onClick={() => handleTestKey(apiKeyInput.trim())}
                    disabled={isTesting}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    {isTesting ? "Testing..." : "Verify First"}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!apiKeyInput.trim() || isSaving}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save & Encrypt</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
