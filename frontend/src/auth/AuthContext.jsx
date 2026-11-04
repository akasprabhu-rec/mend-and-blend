import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase.js";

const AuthContext = createContext(null);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function getProfileSyncError(error) {
  if (error.code === "permission-denied") {
    const projectId = db?.app.options.projectId;
    const deployCommand = projectId
      ? `firebase deploy --only firestore:rules --project ${projectId}`
      : "deploy the Firestore rules for the Firebase project configured in the frontend";
    return `Firestore denied access to your own customer profile (users/{Firebase UID}). Google sign-in succeeded, but the active rules may not match this app's Firebase project. Verify that the owner-only profile rules are deployed to ${projectId || "the configured project"} with: ${deployCommand}`;
  }
  return error.message || "Could not save your profile.";
}

async function saveUserProfile(user) {
  if (!db || !auth || auth.currentUser?.uid !== user.uid) {
    throw new Error("Your signed-in account could not be matched to the configured Firebase project.");
  }
  const profileRef = doc(db, "users", user.uid);

  try {
    await runTransaction(db, async (transaction) => {
      const profile = await transaction.get(profileRef);
      transaction.set(
        profileRef,
        {
          uid: user.uid,
          displayName: user.displayName ?? "",
          email: user.email ?? "",
          photoURL: user.photoURL ?? null,
          updatedAt: serverTimestamp(),
          ...(!profile.exists() ? { createdAt: serverTimestamp() } : {}),
        },
        { merge: true },
      );
    });
  } catch (error) {
    const profileError = new Error(getProfileSyncError(error), { cause: error });
    profileError.code = error.code;
    throw profileError;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setProfileError("");

      try {
        if (nextUser) await saveUserProfile(nextUser);
      } catch (error) {
        if (active) setProfileError(error.message || "Could not save your profile.");
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    if (!auth) throw new Error("Firebase is not configured for this application.");

    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithPopup(auth, googleProvider);
    await saveUserProfile(credential.user);
    return credential.user;
  }

  async function signOut() {
    if (!auth) throw new Error("Firebase is not configured for this application.");
    await firebaseSignOut(auth);
  }

  const value = useMemo(
    () => ({ user, loading, profileError, signInWithGoogle, signOut }),
    [user, loading, profileError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
