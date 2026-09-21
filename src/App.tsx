import React, { useState, useEffect } from "react";
import { JobApplication, ApplicationStatus, MasterProfile } from "./types";
import {
  hasCustomEncryptedApiKey,
  clearLegacyUnscopedKeys,
  clearEncryptedApiKey,
} from "./utils/crypto";
import {
  loadMasterProfile,
  saveMasterProfile,
  hasConfiguredMasterProfile,
  wipeMasterProfileToCleanSlate,
  clearLegacyUnscopedProfile,
  createEmptyMasterProfile,
} from "./utils/masterProfile";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { ApplicationDetail } from "./components/ApplicationDetail";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { NewApplicationModal } from "./components/NewApplicationModal";
import { ProfileView } from "./components/ProfileView";
import { TutorialModal } from "./components/TutorialModal";
import { DeleteAccountModal } from "./components/DeleteAccountModal";
import { LegalModal, LegalModalType } from "./components/LegalModal";
import { ToastProvider, useToast } from "./components/Toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LandingPage } from "./components/LandingPage";
import {
  saveProfileToFirestore,
  loadProfileFromFirestore,
  saveApplicationToFirestore,
  loadApplicationsFromFirestore,
  deleteApplicationFromFirestore,
  deleteAllUserDataFromFirestore,
} from "./utils/firestoreService";

const TUTORIAL_COMPLETED_KEY = "ats_tutorial_completed_v1";

function MainApp() {
  const {
    user,
    loading: authLoading,
    deleteCurrentUser,
    reauthenticateUser,
  } = useAuth();
  const { showToast } = useToast();
  // Navigation View State: 'dashboard' | 'profile'
  const [currentView, setCurrentView] = useState<"dashboard" | "profile">(
    "dashboard",
  );

  // Profile state
  const [masterProfile, setMasterProfile] = useState<MasterProfile>(
    createEmptyMasterProfile,
  );
  const [isFirstTimeOnboarding, setIsFirstTimeOnboarding] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);

  // Applications state
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);

  // API Key state
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);
  const [isCustomKey, setIsCustomKey] = useState(false);

  // Load User Data from Firestore when user logs in
  useEffect(() => {
    if (!user) {
      // Signed out: drop every trace of the previous account from memory so the
      // next person to sign in on this browser starts from a blank slate.
      setMasterProfile(createEmptyMasterProfile());
      setApplications([]);
      setSelectedAppId(null);
      setCurrentView("dashboard");
      setIsDataLoaded(false);
      return;
    }

    const uid = user.uid;
    let isMounted = true;

    // Paint instantly from this user's own cache while Firestore loads.
    setMasterProfile(loadMasterProfile(uid));

    async function syncUserData() {
      try {
        // 1. Fetch profile from Firestore
        const cloudProfile = await loadProfileFromFirestore(uid);
        if (cloudProfile && isMounted) {
          setMasterProfile(cloudProfile);
          saveMasterProfile(cloudProfile, uid);
        } else if (isMounted) {
          // If no cloud profile yet, try syncing local profile if configured
          const localProfile = loadMasterProfile(uid);
          if (localProfile.fullName || localProfile.experience.length > 0) {
            await saveProfileToFirestore(uid, localProfile);
          }
        }

        // 2. Fetch applications from Firestore
        const cloudApps = await loadApplicationsFromFirestore(uid);
        if (isMounted) {
          setApplications(cloudApps);
          setIsDataLoaded(true);
        }
      } catch (err) {
        console.error("Error syncing with Firestore:", err);
        if (isMounted) setIsDataLoaded(true);
      }
    }

    syncUserData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // First time check: Open tutorial for new users automatically based on their user account
  useEffect(() => {
    if (!user) return;
    try {
      const hasCompletedTour = localStorage.getItem(
        `${TUTORIAL_COMPLETED_KEY}_${user.uid}`,
      );
      if (!hasCompletedTour) {
        setIsTutorialOpen(true);
      }
    } catch (e) {
      console.error("Error checking tutorial status:", e);
    }
  }, [user?.uid]);

  // First time usage check: Show user the Profile page first if not yet configured
  useEffect(() => {
    if (!user) return;
    const isConfigured = hasConfiguredMasterProfile(user.uid);
    if (!isConfigured) {
      setIsFirstTimeOnboarding(true);
      setCurrentView("profile");
    }
  }, [user]);

  // Handle master profile save
  const handleSaveMasterProfile = async (updated: MasterProfile) => {
    setMasterProfile(updated);
    setIsFirstTimeOnboarding(false);
    if (!user) return;

    saveMasterProfile(updated, user.uid);
    try {
      await saveProfileToFirestore(user.uid, updated);
    } catch (e) {
      console.error("Failed to save profile to Firestore:", e);
      showToast({
        type: "error",
        title: "Profile Not Saved to Cloud",
        message:
          "Your profile is saved on this device but could not sync. If you set a profile photo, try a smaller image.",
      });
    }
  };

  // Clear any legacy unscoped leftover keys on boot and recheck on user change
  useEffect(() => {
    clearLegacyUnscopedKeys();
    clearLegacyUnscopedProfile();
  }, []);

  useEffect(() => {
    checkApiKeyStatus();
  }, [user?.uid]);

  const checkApiKeyStatus = () => {
    const customExists = hasCustomEncryptedApiKey(user?.uid);
    setIsCustomKey(customExists);
    setIsApiKeyConfigured(customExists);
  };

  const handleApplicationCreated = async (newApp: JobApplication) => {
    setApplications((prev) => [newApp, ...prev]);
    setSelectedAppId(newApp.id);
    setCurrentView("dashboard");
    setIsNewAppModalOpen(false);

    if (user) {
      try {
        await saveApplicationToFirestore(user.uid, newApp);
      } catch (e) {
        console.error("Failed to save new application to Firestore:", e);
      }
    }
  };

  const handleUpdateApplication = async (updated: JobApplication) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updated.id ? updated : app)),
    );

    if (user) {
      try {
        await saveApplicationToFirestore(user.uid, updated);
      } catch (e) {
        console.error("Failed to update application in Firestore:", e);
      }
    }
  };

  const handleDeleteApplication = async (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
    if (selectedAppId === id) {
      setSelectedAppId(null);
    }

    if (user) {
      try {
        await deleteApplicationFromFirestore(user.uid, id);
      } catch (e) {
        console.error("Failed to delete application from Firestore:", e);
      }
    }
  };

  const handleCompleteTutorial = () => {
    try {
      if (user) {
        localStorage.setItem(`${TUTORIAL_COMPLETED_KEY}_${user.uid}`, "true");
      }
    } catch (e) {
      console.error("Failed to save tutorial status:", e);
    }
    setIsTutorialOpen(false);
    if (!hasConfiguredMasterProfile(user?.uid)) {
      setCurrentView("profile");
    }
  };

  const handleDeleteAccount = async (password?: string) => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      // If user provided a password (or if they are an email user), reauthenticate first if possible
      if (password) {
        try {
          await reauthenticateUser(password);
        } catch (authErr: any) {
          showToast({
            type: "error",
            title: "Authentication Failed",
            message:
              "The password entered was incorrect. Please check and try again.",
          });
          setIsDeletingAccount(false);
          return;
        }
      }

      // 1. Delete all Firestore data for this user
      await deleteAllUserDataFromFirestore(user.uid);

      // 2. Clear local data and encryption keys
      clearEncryptedApiKey(user.uid);
      setMasterProfile(wipeMasterProfileToCleanSlate(user.uid));
      try {
        localStorage.removeItem(`${TUTORIAL_COMPLETED_KEY}_${user.uid}`);
      } catch (e) {
        console.error(e);
      }

      // 3. Delete Firebase Auth user (with automatic popup fallback if Google user requires recent login)
      await deleteCurrentUser();

      setIsDeleteAccountModalOpen(false);
      showToast({
        type: "success",
        title: "Account Deleted",
        message:
          "Your account and all associated data have been permanently deleted.",
      });
    } catch (err: any) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        // User closed Google auth popup during re-auth
        setIsDeletingAccount(false);
        return;
      }

      console.error("Account deletion failed:", err);
      if (err.code === "auth/requires-recent-login") {
        showToast({
          type: "error",
          title: "Re-authentication Required",
          message:
            "Please log out and log back in, or enter your credentials when prompted, then retry deleting your account.",
        });
      } else {
        showToast({
          type: "error",
          title: "Deletion Error",
          message: err.message || "Failed to delete account. Please try again.",
        });
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in, render single-section Homepage with Auth
  if (!user) {
    return <LandingPage />;
  }

  const selectedApplication = applications.find(
    (app) => app.id === selectedAppId,
  );

  // Summary stats
  const totalApps = applications.length;
  const avgAtsScore =
    totalApps > 0
      ? Math.round(
          applications.reduce(
            (acc, a) => acc + (a.atsAnalysis?.overallScore || 0),
            0,
          ) / (applications.filter((a) => a.atsAnalysis).length || 1),
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenNewApplication={() => setIsNewAppModalOpen(true)}
        onNavigateToProfile={() => {
          setCurrentView("profile");
          setSelectedAppId(null);
        }}
        onNavigateToDashboard={() => {
          setCurrentView("dashboard");
          setSelectedAppId(null);
        }}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        activeView={selectedAppId ? "application-detail" : currentView}
        masterProfile={masterProfile}
        isApiKeyConfigured={isApiKeyConfigured}
        isCustomKey={isCustomKey}
        totalApps={totalApps}
        avgAtsScore={avgAtsScore}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "profile" && !selectedAppId ? (
          <ProfileView
            currentProfile={masterProfile}
            onSaveProfile={handleSaveMasterProfile}
            onNavigateToDashboard={() => setCurrentView("dashboard")}
            onOpenNewTailoredJob={() => setIsNewAppModalOpen(true)}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        ) : selectedApplication ? (
          <ApplicationDetail
            application={selectedApplication}
            onBack={() => setSelectedAppId(null)}
            onUpdateApplication={handleUpdateApplication}
            onDeleteApplication={handleDeleteApplication}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        ) : (
          <Dashboard
            applications={applications}
            onSelectApplication={(app) => {
              setSelectedAppId(app.id);
            }}
            onOpenNewModal={() => setIsNewAppModalOpen(true)}
            onDeleteApplication={handleDeleteApplication}
            masterProfile={masterProfile}
            onNavigateToProfile={() => {
              setCurrentView("profile");
              setSelectedAppId(null);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span>go get that bag &lt;3 and referral me as a thank you</span>
            <span>•</span>
            <span>
              made with love{" "}
              <a
                href="https://github.com/wtryab-re"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-800 hover:text-indigo-600 underline font-medium transition-colors"
              >
                wtryab
              </a>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
            <button
              onClick={() => setLegalModalType("privacy")}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => setLegalModalType("terms")}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              {isCustomKey ? "Manage API Key" : "Configure API Key"}
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => setIsDeleteAccountModalOpen(true)}
              className="text-rose-500 hover:text-rose-700 font-medium transition-colors cursor-pointer"
            >
              Delete Account
            </button>
          </div>
        </div>
      </footer>

      {/* Privacy Policy & Terms of Service Modal */}
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />

      {/* Delete Account Danger Zone Modal */}
      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeletingAccount}
      />

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => {
          setIsTutorialOpen(false);
          try {
            if (user) {
              localStorage.setItem(
                `${TUTORIAL_COMPLETED_KEY}_${user.uid}`,
                "true",
              );
            }
          } catch (e) {
            console.error(e);
          }
        }}
        onComplete={handleCompleteTutorial}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyUpdated={checkApiKeyStatus}
      />

      {/* New Application Wizard Modal */}
      <NewApplicationModal
        isOpen={isNewAppModalOpen}
        onClose={() => setIsNewAppModalOpen(false)}
        onApplicationCreated={handleApplicationCreated}
        masterProfile={masterProfile}
        onNavigateToProfile={() => {
          setIsNewAppModalOpen(false);
          setCurrentView("profile");
          setSelectedAppId(null);
        }}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
