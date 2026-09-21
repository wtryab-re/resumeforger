import React, { useState, useRef } from "react";
import { 
  MasterProfile, 
  ExperienceItem, 
  EducationItem, 
  ProfileExperienceItem,
  ProfileEducationItem, 
  VolunteerItem, 
  CertificationOrAwardItem, 
  CustomField, 
  CustomSection 
} from "../types";
import { 
  masterProfileToPlainText, 
  createEmptyMasterProfile
} from "../utils/masterProfile";
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  HeartHandshake, 
  Award, 
  Plus, 
  Trash2, 
  FileText, 
  Save, 
  Camera, 
  Check, 
  Loader2, 
  Eye, 
  Sliders, 
  Tag, 
  Link as LinkIcon, 
  HelpCircle, 
  Download, 
  Copy 
} from "lucide-react";
import { useToast } from "./Toast";

interface ProfileViewProps {
  currentProfile: MasterProfile;
  onSaveProfile: (profile: MasterProfile) => void;
  onNavigateToDashboard: () => void;
  onOpenNewTailoredJob: () => void;
  onOpenApiKeyModal?: () => void;
}

type TabType = "editor" | "preview";

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentProfile,
  onSaveProfile,
  onNavigateToDashboard,
  onOpenNewTailoredJob,
  onOpenApiKeyModal,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("editor");
  const [profile, setProfile] = useState<MasterProfile>(currentProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // New custom field form helper state
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [isAddingField, setIsAddingField] = useState(false);

  // New custom section form helper state
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionContent, setNewSectionContent] = useState("");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Keep in sync if currentProfile updates from external
  React.useEffect(() => {
    setProfile(currentProfile);
  }, [currentProfile]);

  const [savedSection, setSavedSection] = useState<string | null>(null);

  // Handle Save
  const handleSave = () => {
    setIsSaving(true);
    onSaveProfile(profile);
    setIsSaving(false);
    setSaveSuccess(true);
    showToast({
      type: "success",
      title: "Profile Saved",
      message: "Master Profile saved successfully.",
    });
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveSection = (sectionKey: string, sectionTitle: string) => {
    onSaveProfile(profile);
    setSavedSection(sectionKey);
    showToast({
      type: "success",
      title: "Section Saved",
      message: `${sectionTitle} saved successfully.`,
    });
    setTimeout(() => {
      setSavedSection((curr) => (curr === sectionKey ? null : curr));
    }, 2200);
  };

  const renderSectionSaveButton = (sectionKey: string, sectionTitle: string) => (
    <button
      type="button"
      onClick={() => handleSaveSection(sectionKey, sectionTitle)}
      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors cursor-pointer shrink-0"
      title={`Save ${sectionTitle}`}
    >
      {savedSection === sectionKey ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span>Saved</span>
        </>
      ) : (
        <>
          <Save className="w-3 h-3" />
          <span>Save Section</span>
        </>
      )}
    </button>
  );

  // Avatar upload handler.
  // The avatar is stored inline on the profile document, and Firestore caps a
  // document at 1 MiB — so the image is downscaled to a small square thumbnail
  // (a few KB) before it ever reaches state. Storing the original file would
  // silently break every subsequent profile save.
  const AVATAR_MAX_PX = 256;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({
        type: "error",
        title: "Unsupported File",
        message: "Please choose an image file.",
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        // Centre-crop to a square, then scale down to AVATAR_MAX_PX.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const target = Math.min(side, AVATAR_MAX_PX);

        const canvas = document.createElement("canvas");
        canvas.width = target;
        canvas.height = target;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);

        setProfile((prev) => ({
          ...prev,
          avatarUrl: canvas.toDataURL("image/jpeg", 0.82),
        }));
      } catch (err) {
        console.error("Avatar processing failed:", err);
        showToast({
          type: "error",
          title: "Could Not Process Image",
          message: "That image could not be resized. Please try a different file.",
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      showToast({
        type: "error",
        title: "Could Not Read Image",
        message: "That file could not be opened as an image.",
      });
    };

    img.src = objectUrl;
  };

  const handleRemoveAvatar = () => {
    setProfile((prev) => ({
      ...prev,
      avatarUrl: undefined,
    }));
  };

  // Add Item Helpers
  const handleAddExperience = () => {
    const newExp: ProfileExperienceItem = {
      id: `exp-${Date.now()}`,
      company: "",
      role: "",
      startDate: "",
      endDate: "",
      location: "",
      bullets: [],
      skillsUsed: [],
    };
    setProfile((prev) => ({
      ...prev,
      experience: [newExp, ...(prev.experience || [])],
    }));
  };

  const handleUpdateExperience = (id: string, field: keyof ExperienceItem, value: any) => {
    setProfile((prev) => ({
      ...prev,
      experience: prev.experience?.map((exp) =>
        exp.id === id ? { ...exp, [field]: value, id: exp.id } : exp
      ),
    }));
  };

  const handleDeleteExperience = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      experience: prev.experience?.filter((exp) => exp.id !== id),
    }));
  };

  const handleAddEducation = () => {
    const newEdu: ProfileEducationItem = {
      id: `edu-${Date.now()}`,
      institution: "",
      degree: "",
      fieldOfStudy: "",
      graduationYear: "",
    };
    setProfile((prev) => ({
      ...prev,
      education: [...(prev.education || []), newEdu],
    }));
  };

  const handleUpdateEducation = (id: string, field: keyof EducationItem, value: any) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education?.map((edu) =>
        edu.id === id ? { ...edu, [field]: value, id: edu.id } : edu
      ),
    }));
  };

  const handleDeleteEducation = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education?.filter((edu) => edu.id !== id),
    }));
  };

  const handleAddVolunteer = () => {
    const newVol: VolunteerItem = {
      id: `vol-${Date.now()}`,
      organization: "",
      role: "",
      startDate: "",
      endDate: "",
      description: "",
      bullets: [],
    };
    setProfile((prev) => ({
      ...prev,
      volunteerExperience: [...(prev.volunteerExperience || []), newVol],
    }));
  };

  const handleUpdateVolunteer = (id: string, field: keyof VolunteerItem, value: any) => {
    setProfile((prev) => ({
      ...prev,
      volunteerExperience: prev.volunteerExperience?.map((v) =>
        v.id === id ? { ...v, [field]: value, id: v.id } : v
      ),
    }));
  };

  const handleDeleteVolunteer = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      volunteerExperience: prev.volunteerExperience?.filter((v) => v.id !== id),
    }));
  };

  const handleAddCertification = () => {
    const newCert: CertificationOrAwardItem = {
      id: `cert-${Date.now()}`,
      title: "",
      issuer: "",
      date: "",
      type: "certification",
    };
    setProfile((prev) => ({
      ...prev,
      certificationsAndAwards: [...(prev.certificationsAndAwards || []), newCert],
    }));
  };

  const handleUpdateCertification = (id: string, field: keyof CertificationOrAwardItem, value: any) => {
    setProfile((prev) => ({
      ...prev,
      certificationsAndAwards: prev.certificationsAndAwards?.map((c) =>
        c.id === id ? { ...c, [field]: value, id: c.id } : c
      ),
    }));
  };

  const handleDeleteCertification = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      certificationsAndAwards: prev.certificationsAndAwards?.filter((c) => c.id !== id),
    }));
  };

  // Custom Fields
  const handleSaveNewCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const field: CustomField = {
      id: `custom-${Date.now()}`,
      label: newFieldLabel.trim(),
      value: newFieldValue.trim(),
    };
    setProfile((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), field],
    }));
    setNewFieldLabel("");
    setNewFieldValue("");
    setIsAddingField(false);
  };

  const handleDeleteCustomField = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      customFields: prev.customFields?.filter((f) => f.id !== id),
    }));
  };

  // Custom Sections
  const handleSaveNewCustomSection = () => {
    if (!newSectionTitle.trim()) return;
    const section: CustomSection = {
      id: `section-${Date.now()}`,
      title: newSectionTitle.trim(),
      content: newSectionContent.trim(),
    };
    setProfile((prev) => ({
      ...prev,
      customSections: [...(prev.customSections || []), section],
    }));
    setNewSectionTitle("");
    setNewSectionContent("");
    setIsAddingSection(false);
  };

  const handleDeleteCustomSection = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      customSections: prev.customSections?.filter((s) => s.id !== id),
    }));
  };

  // Clear profile fields
  const handleClearProfile = () => {
    if (window.confirm("Clear all fields in your Master Profile?")) {
      const empty = createEmptyMasterProfile();
      setProfile(empty);
      onSaveProfile(empty);
      showToast({
        type: "success",
        title: "Profile Cleared",
        message: "All fields cleared.",
      });
    }
  };

  // Copy Plaintext
  const handleCopyProfileText = () => {
    const text = masterProfileToPlainText(profile);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Export JSON
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.fullName.replace(/\s+/g, "_") || "Candidate"}_Profile.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Master Profile
            </h1>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full transition-all">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Manage your career history, skills, education, and custom fields.<br />
            This profile serves as the master source whenever you tailor a resume or generate a cover letter for any job.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Profile</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "editor"
                ? "border-slate-900 text-slate-900 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Profile Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`pb-3 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "preview"
                ? "border-slate-900 text-slate-900 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Formatted Preview</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 pb-2">
          <button
            type="button"
            onClick={handleClearProfile}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            title="Clear all profile fields"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={handleCopyProfileText}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedText ? "Copied" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FULL STRUCTURED PROFILE EDITOR */}
      {activeTab === "editor" && (
        <div className="space-y-4">
          {/* Section 1: Personal Info & Avatar */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Personal & Contact Information
                </h3>
              </div>
              {renderSectionSaveButton("personal", "Personal Information")}
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="relative group w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName || "Profile Avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-slate-400 uppercase">
                      {profile.fullName ? profile.fullName.charAt(0) : "U"}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-900/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[11px] font-medium gap-1"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Change</span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-[11px] text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    Upload Photo
                  </button>
                  {profile.avatarUrl && (
                    <>
                      <span className="text-slate-300 text-xs">•</span>
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Personal Information Inputs */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    placeholder="e.g. Alexandra Bennett"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Role / Professional Title *
                  </label>
                  <input
                    type="text"
                    value={profile.title}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="alexandra@example.com"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Location (City, State / Remote)
                  </label>
                  <input
                    type="text"
                    value={profile.location || ""}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    placeholder="San Francisco, CA (Open to Remote)"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    value={profile.linkedin || ""}
                    onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                    placeholder="linkedin.com/in/alexandrabennett"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Portfolio / Personal Website
                  </label>
                  <input
                    type="url"
                    value={profile.portfolio || ""}
                    onChange={(e) => setProfile({ ...profile, portfolio: e.target.value })}
                    placeholder="https://alexandra.dev"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    GitHub Profile
                  </label>
                  <input
                    type="url"
                    value={profile.github || ""}
                    onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                    placeholder="github.com/alexandra-b"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Professional Summary */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Professional Summary
                </h3>
              </div>
              {renderSectionSaveButton("summary", "Professional Summary")}
            </div>
            <textarea
              rows={4}
              value={profile.summary}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              placeholder="High-impact summary detailing career focus, technical depth, and quantifiable accomplishments..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white leading-relaxed"
            />
          </div>

          {/* Section 3: Core Skills */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Core Skills & Technologies
                </h3>
              </div>
              {renderSectionSaveButton("skills", "Core Skills & Technologies")}
            </div>
            <textarea
              rows={3}
              value={profile.skills?.join(", ") || ""}
              onChange={(e) => {
                const skillsArray = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                setProfile({ ...profile, skills: skillsArray });
              }}
              placeholder="TypeScript, React, Node.js, Python, AWS, PostgreSQL, Docker, GraphQL, CI/CD"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
            />
            <p className="text-[11px] text-slate-500">
              Separate each skill or technology with a comma. These are matched against job descriptions during tailoring.
            </p>
          </div>

          {/* Section 4: Work Experience */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Work Experience
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Position</span>
                </button>
                {renderSectionSaveButton("experience", "Work Experience")}
              </div>
            </div>

            <div className="space-y-3">
              {(!profile.experience || profile.experience.length === 0) ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">No work experience roles added yet.</p>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-slate-900 font-medium hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add your first role</span>
                  </button>
                </div>
              ) : (
                profile.experience.map((exp, idx) => (
                  <div
                    key={exp.id || idx}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => handleUpdateExperience(exp.id, "company", e.target.value)}
                            placeholder="Company"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Role / Title
                          </label>
                          <input
                            type="text"
                            value={exp.role}
                            onChange={(e) => handleUpdateExperience(exp.id, "role", e.target.value)}
                            placeholder="Title"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Dates (Start - End)
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={exp.startDate}
                              onChange={(e) => handleUpdateExperience(exp.id, "startDate", e.target.value)}
                              placeholder="2022"
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                            <span className="text-slate-400 text-xs">-</span>
                            <input
                              type="text"
                              value={exp.endDate}
                              onChange={(e) => handleUpdateExperience(exp.id, "endDate", e.target.value)}
                              placeholder="Present"
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Location
                          </label>
                          <input
                            type="text"
                            value={exp.location || ""}
                            onChange={(e) => handleUpdateExperience(exp.id, "location", e.target.value)}
                            placeholder="City, ST or Remote"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteExperience(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer mt-5"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Accomplishment Bullets (One per line)
                      </label>
                      <textarea
                        rows={3}
                        value={exp.bullets?.join("\n") || ""}
                        onChange={(e) => {
                          const bullets = e.target.value.split("\n").filter((b) => b.trim().length > 0);
                          handleUpdateExperience(exp.id, "bullets", bullets);
                        }}
                        placeholder="• Architected and deployed microservices architecture, boosting platform availability to 99.98%&#10;• Reduced latency by 45% through optimized queries and cache invalidation"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white leading-relaxed font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 5: Education */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Education & Degrees
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Education</span>
                </button>
                {renderSectionSaveButton("education", "Education & Degrees")}
              </div>
            </div>

            <div className="space-y-2.5">
              {(!profile.education || profile.education.length === 0) ? (
                <p className="text-xs text-slate-500 py-2">No education entries added yet.</p>
              ) : (
                profile.education.map((edu, idx) => (
                  <div
                    key={edu.id || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center gap-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1 w-full">
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => handleUpdateEducation(edu.id, "degree", e.target.value)}
                        placeholder="Degree (e.g. B.S.)"
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <input
                        type="text"
                        value={edu.fieldOfStudy}
                        onChange={(e) => handleUpdateEducation(edu.id, "fieldOfStudy", e.target.value)}
                        placeholder="Field / Major (e.g. Computer Science)"
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => handleUpdateEducation(edu.id, "institution", e.target.value)}
                        placeholder="Institution / University"
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <input
                        type="text"
                        value={edu.graduationYear}
                        onChange={(e) => handleUpdateEducation(edu.id, "graduationYear", e.target.value)}
                        placeholder="Graduation Year"
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer self-end sm:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 6: Volunteer Experience */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Volunteer & Community Experience
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddVolunteer}
                  className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Volunteer</span>
                </button>
                {renderSectionSaveButton("volunteer", "Volunteer Experience")}
              </div>
            </div>

            <div className="space-y-2.5">
              {(!profile.volunteerExperience || profile.volunteerExperience.length === 0) ? (
                <p className="text-xs text-slate-500 py-2">No volunteer work added yet.</p>
              ) : (
                profile.volunteerExperience.map((vol, idx) => (
                  <div
                    key={vol.id || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                        <input
                          type="text"
                          value={vol.organization}
                          onChange={(e) => handleUpdateVolunteer(vol.id, "organization", e.target.value)}
                          placeholder="Organization Name"
                          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <input
                          type="text"
                          value={vol.role}
                          onChange={(e) => handleUpdateVolunteer(vol.id, "role", e.target.value)}
                          placeholder="Role (e.g. Mentor)"
                          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <input
                          type="text"
                          value={vol.endDate ? `${vol.startDate || ''} - ${vol.endDate}` : vol.startDate || ""}
                          onChange={(e) => handleUpdateVolunteer(vol.id, "startDate", e.target.value)}
                          placeholder="Dates"
                          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteVolunteer(vol.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={vol.description || ""}
                      onChange={(e) => handleUpdateVolunteer(vol.id, "description", e.target.value)}
                      placeholder="Brief description of volunteer contribution or community impact..."
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 7: Certifications & Awards */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Certifications & Awards
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCertification}
                  className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Credential</span>
                </button>
                {renderSectionSaveButton("certifications", "Certifications & Awards")}
              </div>
            </div>

            <div className="space-y-2.5">
              {(!profile.certificationsAndAwards || profile.certificationsAndAwards.length === 0) ? (
                <p className="text-xs text-slate-500 py-2">No certifications or awards listed.</p>
              ) : (
                profile.certificationsAndAwards.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center gap-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1 w-full">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateCertification(item.id, "title", e.target.value)}
                        placeholder="Title (e.g. AWS Solutions Architect)"
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <input
                        type="text"
                        value={item.issuer}
                        onChange={(e) => handleUpdateCertification(item.id, "issuer", e.target.value)}
                        placeholder="Issuer (e.g. Amazon Web Services)"
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <input
                        type="text"
                        value={item.date}
                        onChange={(e) => handleUpdateCertification(item.id, "date", e.target.value)}
                        placeholder="Year / Date"
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <select
                        value={item.type}
                        onChange={(e) => handleUpdateCertification(item.id, "type", e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      >
                        <option value="certification">Certification</option>
                        <option value="award">Award / Honor</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCertification(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer self-end sm:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 8: Dynamic Custom Input Fields */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-600" />
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    Custom Fields
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add attributes like Languages, Security Clearance, or Work Authorization.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingField(true)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Field</span>
                </button>
                {renderSectionSaveButton("customFields", "Custom Fields")}
              </div>
            </div>

            {/* Add Custom Field Form */}
            {isAddingField && (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
                <div className="text-xs font-semibold text-slate-800">New Custom Field</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="Field Name (e.g. Work Authorization)"
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <input
                    type="text"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    placeholder="Field Value (e.g. US Citizen)"
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingField(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewCustomField}
                    disabled={!newFieldLabel.trim()}
                    className="px-3 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium disabled:opacity-50 cursor-pointer"
                  >
                    Save Field
                  </button>
                </div>
              </div>
            )}

            {/* List Custom Fields */}
            <div className="space-y-2">
              {(!profile.customFields || profile.customFields.length === 0) ? (
                <p className="text-xs text-slate-400 py-1">
                  No custom fields defined yet.
                </p>
              ) : (
                profile.customFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 bg-slate-50/70"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-xs font-semibold text-slate-700 min-w-[120px]">
                        {field.label}:
                      </span>
                      <span className="text-xs text-slate-900">
                        {field.value}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomField(field.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 9: Custom Sections */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-600" />
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    Custom Sections
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Create standalone sections for Patents, Publications, Speaking, or Open Source projects.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSection(true)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Section</span>
                </button>
                {renderSectionSaveButton("customSections", "Custom Sections")}
              </div>
            </div>

            {/* Add Custom Section Form */}
            {isAddingSection && (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
                <div className="text-xs font-semibold text-slate-800">New Custom Section</div>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Section Title (e.g. Selected Patents & Publications)"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <textarea
                  rows={3}
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  placeholder="Section content or bullet points..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingSection(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewCustomSection}
                    disabled={!newSectionTitle.trim()}
                    className="px-3 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium disabled:opacity-50 cursor-pointer"
                  >
                    Save Section
                  </button>
                </div>
              </div>
            )}

            {/* List Custom Sections */}
            <div className="space-y-2.5">
              {(!profile.customSections || profile.customSections.length === 0) ? (
                <p className="text-xs text-slate-400 py-1">
                  No custom sections yet.
                </p>
              ) : (
                profile.customSections.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        {sec.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomSection(sec.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <pre className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed">
                      {sec.content}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 10: Additional Notes */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Additional Notes & Highlights
                </h3>
              </div>
              {renderSectionSaveButton("notes", "Additional Notes")}
            </div>
            <textarea
              rows={3}
              value={profile.notes || ""}
              onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
              placeholder="Any other career context, key milestones, or target preferences..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white leading-relaxed"
            />
          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClearProfile}
              className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors cursor-pointer"
            >
              Clear Fields
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: FORMATTED PREVIEW (Times New Roman) */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Formatted Profile Overview
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This text representation is automatically formatted in Times New Roman and used when tailoring applications.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyProfileText}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedText ? "Copied" : "Copy Profile Text"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download JSON</span>
                </button>
              </div>
            </div>

            <pre className="p-5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-900 font-['Times_New_Roman',_Times,_serif] whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
              {masterProfileToPlainText(profile)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
