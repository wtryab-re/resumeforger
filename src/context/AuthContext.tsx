import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  fbSignOut, 
  onAuthStateChanged, 
  FirebaseUser 
} from "../lib/firebase";
import { deleteUser, reauthenticateWithPopup, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteCurrentUser: () => Promise<void>;
  reauthenticateUser: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const deleteCurrentUser = async () => {
    if (!auth.currentUser) return;
    try {
      await deleteUser(auth.currentUser);
    } catch (err: any) {
      // If re-authentication is required
      if (err.code === "auth/requires-recent-login") {
        const isGoogle = auth.currentUser.providerData.some(
          (p) => p.providerId === "google.com"
        );
        if (isGoogle) {
          // Attempt popup reauthentication immediately
          await reauthenticateWithPopup(auth.currentUser, googleProvider);
          await deleteUser(auth.currentUser);
          return;
        }
      }
      throw err;
    }
  };

  const reauthenticateUser = async (password?: string) => {
    if (!auth.currentUser) throw new Error("No active user to reauthenticate");
    const isGoogle = auth.currentUser.providerData.some(
      (p) => p.providerId === "google.com"
    );
    if (isGoogle) {
      await reauthenticateWithPopup(auth.currentUser, googleProvider);
    } else if (password && auth.currentUser.email) {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
    } else {
      throw new Error("Password is required for email account verification");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        deleteCurrentUser,
        reauthenticateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
