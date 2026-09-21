import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App instance singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Initialize Cloud Firestore using the configured database ID.
// ignoreUndefinedProperties: optional profile/application fields are often
// undefined (e.g. a removed avatar), and Firestore otherwise rejects the whole
// write, leaving data saved only in the local cache.
const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
export const db = (() => {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true }, databaseId);
  } catch {
    // Already initialized (e.g. after a hot reload) — reuse that instance.
    return getFirestore(app, databaseId);
  }
})();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot
};
export type { FirebaseUser };
