import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { apiRequest } from "@/lib/api";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role?: string;
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
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("user_profile");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Safety fallback timer to prevent infinite loading state
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: any) => {
      if (!fbUser) {
        // If not in firebase, check saved local session
        const savedToken = localStorage.getItem("token");
        const savedProfile = localStorage.getItem("user_profile");
        if (!savedToken || !savedProfile) {
          setUser(null);
          setToken(null);
        }
      } else {
        const idToken = await fbUser.getIdToken();
        setToken(idToken);
        localStorage.setItem("token", idToken);

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
          email: fbUser.email || "engineer@grid.com",
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
        email: fbUser.email || email.trim(),
        name: fbUser.displayName || email.split("@")[0] || "Substation Engineer",
        role,
      };

      setUser(userObj);
      localStorage.setItem("user_profile", JSON.stringify(userObj));
    } catch (firebaseErr: any) {
      // Fallback: Try local backend REST auth if available
      try {
        const data = await apiRequest<{ token: string; user: UserProfile }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        if (data && data.token) {
          setToken(data.token);
          localStorage.setItem("token", data.token);
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
    } catch (firebaseErr: any) {
      // Fallback: Try local backend REST registration if available
      try {
        const data = await apiRequest<{ token: string; user: UserProfile }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password, role }),
        });
        if (data && data.token) {
          setToken(data.token);
          localStorage.setItem("token", data.token);
          setUser(data.user);
          localStorage.setItem("user_profile", JSON.stringify(data.user));
          return;
        }
      } catch {
        // Ignore
      }

      let errorMsg = firebaseErr.message || "Failed to register member account.";
      if (firebaseErr.code === "auth/email-already-in-use") {
        errorMsg = "An account with this email address already exists. Please sign in instead.";
      } else if (firebaseErr.code === "auth/weak-password") {
        errorMsg = "Password must be at least 6 characters long.";
      }
      throw new Error(errorMsg);
    }
  };

  const logout = () => {
    signOut(auth).catch(() => {});
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user_profile");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token || !!user,
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
