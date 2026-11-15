import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { User } from "../types";

const BOOTSTRAPPED_ADMIN_EMAIL = "stephenmayowa112@gmail.com";

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        const userDocPath = `users/${firebaseUser.uid}`;
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const isOwnerAdmin =
          firebaseUser.email?.toLowerCase().trim() === BOOTSTRAPPED_ADMIN_EMAIL &&
          firebaseUser.emailVerified;

        unsubscribeDoc = onSnapshot(
          userDocRef,
          (userDocSnap) => {
            if (userDocSnap.exists()) {
              const data = userDocSnap.data() as Omit<User, "id">;
              if (isOwnerAdmin && data.role !== "admin") {
                updateDoc(userDocRef, { role: "admin" }).catch((err) =>
                  console.error("Failed to promote bootstrapped admin:", err)
                );
                setDbUser({ id: userDocSnap.id, ...data, role: "admin" });
              } else {
                setDbUser({ id: userDocSnap.id, ...data });
              }
            } else {
              setDbUser(null);
            }
            setLoading(false);
          },
          (error) => {
            setLoading(false);
            handleFirestoreError(error, OperationType.GET, userDocPath);
          }
        );
      } else {
        setDbUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, dbUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
