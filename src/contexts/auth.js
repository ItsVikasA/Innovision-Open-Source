"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });

            if (!response.ok) {
              console.error("AUTH_CONTEXT: Failed to sync session cookie");
            }

            if (db) {
              const userRef = doc(db, "users", firebaseUser.email);
              const userSnap = await getDoc(userRef);

              if (userSnap.exists()) {
                setUser({
                  ...firebaseUser,
                  ...userSnap.data(),
                });
              } else {
                setUser(firebaseUser);
              }
            } else {
              setUser(firebaseUser);
            }
          } catch (error) {
            console.error("AUTH_CONTEXT: error during sync/fetch", error);
            setUser(firebaseUser);
          }
        } else {
          await fetch("/api/auth/session", {
            method: "DELETE",
          });
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("AUTH_CONTEXT: Firebase auth unavailable", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const googleSignIn = async () => {
    if (!auth) {
      throw new Error("Firebase is not configured. Add credentials to .env to enable sign-in.");
    }
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user, "google");
      return result.user;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const githubSignIn = async () => {
    if (!auth) {
      throw new Error("Firebase is not configured. Add credentials to .env to enable sign-in.");
    }
    const provider = new GithubAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user, "github");
      return result.user;
    } catch (error) {
      console.error("Error signing in with Github:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      await fetch("/api/auth/session", { method: "DELETE" });
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const saveUserToFirestore = async (user, providerName) => {
    if (!db) return;
    try {
      const userRef = doc(db, "users", user.email);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          image: user.photoURL,
          provider: providerName,
          xp: 0,
          roadmapLevel: {
            fast: 0,
            inDepth: 0,
            balanced: 0,
          },
          xptrack: Object.fromEntries(
            Array(12)
              .fill(0)
              .map((value, index) => [index, value])
          ),
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error saving user information:", error);
    }
  };

  const getToken = async () => {
    if (!auth?.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleSignIn, githubSignIn, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
