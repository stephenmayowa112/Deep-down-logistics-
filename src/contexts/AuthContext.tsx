import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { User } from "../types";

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: User | null;
  loading: boolean;
  isMock: boolean;
  setMockMode: (role: "admin" | "client" | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  isMock: false,
  setMockMode: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);

  const setMockMode = (role: "admin" | "client" | null) => {
    if (role) {
      localStorage.setItem("ddl_mock_role", role);
      setIsMock(true);
      setUser({
        uid: `mock-${role}-uid`,
        email: `${role}@test.com`,
        emailVerified: true,
      } as any);
      setDbUser({
        id: `mock-${role}-id`,
        role: role,
        phone_number: role === "admin" ? "0000000000" : "8033245670",
        shipping_mark: role === "admin" ? "ADMIN" : "BIGFISH",
        is_verified: true,
      });
      setLoading(false);
    } else {
      localStorage.removeItem("ddl_mock_role");
      setIsMock(false);
      setUser(null);
      setDbUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if mock mode is stored in localStorage
    const savedMockRole = localStorage.getItem("ddl_mock_role");
    if (savedMockRole === "admin" || savedMockRole === "client") {
      setMockMode(savedMockRole as "admin" | "client");
      return;
    }

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user document and listen for updates
        const userDocRef = doc(db, "users", firebaseUser.uid);
        unsubscribeDoc = onSnapshot(userDocRef, (userDocSnap) => {
          if (userDocSnap.exists()) {
            setDbUser({ id: userDocSnap.id, ...userDocSnap.data() } as User);
          } else {
            setDbUser(null);
          }
          setLoading(false);
        });
      } else {
        setDbUser(null);
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, isMock, setMockMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
