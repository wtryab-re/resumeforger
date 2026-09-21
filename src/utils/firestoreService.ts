import { 
  db, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  query,
  orderBy 
} from "../lib/firebase";
import { MasterProfile, JobApplication } from "../types";
import { createEmptyMasterProfile } from "../utils/masterProfile";

/**
 * Save user's master profile to Firestore
 */
export async function saveProfileToFirestore(userId: string, profile: MasterProfile): Promise<void> {
  const profileRef = doc(db, "users", userId);
  await setDoc(profileRef, {
    masterProfile: profile,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Load user's master profile from Firestore
 */
export async function loadProfileFromFirestore(userId: string): Promise<MasterProfile | null> {
  try {
    const profileRef = doc(db, "users", userId);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.masterProfile) {
        return data.masterProfile as MasterProfile;
      }
    }
  } catch (err) {
    console.error("Failed to load profile from Firestore:", err);
  }
  return null;
}

/**
 * Save or update a single job application to Firestore
 */
export async function saveApplicationToFirestore(userId: string, application: JobApplication): Promise<void> {
  const appRef = doc(db, "users", userId, "applications", application.id);
  // Always stamp the write time. Trusting the caller's updatedAt left the
  // orderBy("updatedAt") dashboard sort reflecting whatever the caller
  // happened to set, rather than when the document actually changed.
  await setDoc(appRef, {
    ...application,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Load all job applications for a user from Firestore
 */
export async function loadApplicationsFromFirestore(userId: string): Promise<JobApplication[]> {
  try {
    const appsRef = collection(db, "users", userId, "applications");
    const q = query(appsRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    const list: JobApplication[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as JobApplication);
    });
    return list;
  } catch (err) {
    console.error("Failed to load applications from Firestore:", err);
    return [];
  }
}

/**
 * Delete a job application from Firestore
 */
export async function deleteApplicationFromFirestore(userId: string, applicationId: string): Promise<void> {
  const appRef = doc(db, "users", userId, "applications", applicationId);
  await deleteDoc(appRef);
}

/**
 * Delete all user data (profile and subcollection documents) from Firestore
 */
export async function deleteAllUserDataFromFirestore(userId: string): Promise<void> {
  try {
    // 1. Delete all applications in subcollection
    const appsRef = collection(db, "users", userId, "applications");
    const snapshot = await getDocs(appsRef);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    // 2. Delete main user document
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);
  } catch (err) {
    console.error("Error deleting all user data from Firestore:", err);
    throw err;
  }
}
