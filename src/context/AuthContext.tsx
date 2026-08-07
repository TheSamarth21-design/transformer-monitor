import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { apiRequest } from "@/lib/api";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem("user_profile");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Instant safety timeout: Guarantee spinner clears in <= 600ms
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 600);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: any) => {
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        localStorage.setItem("token", idToken);
        setToken(idToken);

        let role = "Substation Engineer";
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            role = userDoc.data().role || role;
          }
        } catch {
          // Ignore
        }

        const userObj: UserProfile = {
          id: fbUser.uid,
          email: fbUser.email || "engineer@transformer.com",
          name: fbUser.displayName || fbUser.email?.split("@")[0] || "Substation Engineer",
          role,
        };

        setUser(userObj);
        localStorage.setItem("user_profile", JSON.stringify(userObj));
      }
      setIsLoading(false);
      clearTimeout(safetyTimer);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // 1. Try Firebase Authentication Cloud Sign In
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;
      const idToken = await fbUser.getIdToken();

      localStorage.setItem("token", idToken);
      setToken(idToken);

      let role = "Substation Engineer";
      try {
        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        if (userDoc.exists()) {
          role = userDoc.data().role || role;
        }
      } catch {
        // Ignore
      }

      const userObj: UserProfile = {
        id: fbUser.uid,
        email: fbUser.email || email,
        name: fbUser.displayName || email.split("@")[0],
        role,
      };

      setUser(userObj);
      localStorage.setItem("user_profile", JSON.stringify(userObj));
      setIsLoading(false);
      return;
    } catch (firebaseErr: any) {
      // 2. Fallback to Express Backend Auth API
      try {
        const data = await apiRequest<{ token: string; user: UserProfile }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (data.token) {
          localStorage.setItem("token", data.token);
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem("user_profile", JSON.stringify(data.user));
          setIsLoading(false);
          return;
        }
      } catch {
        // Throw original firebase error if both fail
      }

      let errorMsg = firebaseErr.message || "Failed to sign in.";
      if (firebaseErr.code === "auth/user-not-found" || firebaseErr.code === "auth/wrong-password" || firebaseErr.code === "auth/invalid-credential") {
        errorMsg = "Invalid email or password. If you haven't registered, click 'Register Member'.";
      }
      throw new Error(errorMsg);
    }
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    try {
      // 1. Register Member directly in Firebase Authentication Cloud
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;

      // Update Firebase Profile display name
      await updateProfile(fbUser, { displayName: name });

      const userRole = role || "Substation Engineer";
      const idToken = await fbUser.getIdToken();

      // Store member profile record in Cloud Firestore
      try {
        await setDoc(doc(db, "users", fbUser.uid), {
          id: fbUser.uid,
          name,
          email: email.trim(),
          role: userRole,
          createdAt: new Date().toISOString(),
        });
      } catch {
        // Ignore firestore rule errors if rules restricted
      }

      localStorage.setItem("token", idToken);
      setToken(idToken);

      const userObj: UserProfile = {
        id: fbUser.uid,
        email: email.trim(),
        name,
        role: userRole,
      };

      setUser(userObj);
      localStorage.setItem("user_profile", JSON.stringify(userObj));
      setIsLoading(false);
    } catch (firebaseErr: any) {
      let errorMsg = firebaseErr.message || "Failed to register member.";
      if (firebaseErr.code === "auth/email-already-in-use") {
        errorMsg = "An account with this email address already exists. Please Sign In.";
      } else if (firebaseErr.code === "auth/weak-password") {
        errorMsg = "Password should be at least 6 characters long.";
      }
      throw new Error(errorMsg);
    }
  };

  const logout = () => {
    signOut(auth).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("user_profile");
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token || user),
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
