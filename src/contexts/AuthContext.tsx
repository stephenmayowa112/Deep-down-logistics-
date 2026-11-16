import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { User } from "../types";

export const BOOTSTRAPPED_SUPER_ADMIN_EMAILS = [
  "stephenmayowa112@gmail.com",
  "eyeretega@gmail.com",
];

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
        const normalizedEmail = firebaseUser.email?.toLowerCase().trim() || "";
        const isOwnerSuperAdmin = BOOTSTRAPPED_SUPER_ADMIN_EMAILS.includes(normalizedEmail);

        unsubscribeDoc = onSnapshot(
          userDocRef,
          (userDocSnap) => {
            if (userDocSnap.exists()) {
              const data = userDocSnap.data() as Omit<User, "id">;
              const updates: Record<string, unknown> = {};

              if (isOwnerSuperAdmin && data.role !== "super_admin") {
                updates.role = "super_admin";
                updates.is_verified = true;
                updates.account_status = "approved";
              }
              if (normalizedEmail && !data.email) {
                updates.email = normalizedEmail;
              }

              if (Object.keys(updates).length > 0) {
                updateDoc(userDocRef, updates).catch((err) =>
                  console.error("Failed to sync user metadata:", err)
                );
              }

              setDbUser({
                id: userDocSnap.id,
                ...data,
                ...(isOwnerSuperAdmin
                  ? { role: "super_admin", is_verified: true, account_status: "approved" }
                  : {}),
                email: data.email || normalizedEmail || undefined,
              });
            } else if (isOwnerSuperAdmin) {
              const now = Date.now();
              const autoProfile: Omit<User, "id"> = {
                role: "super_admin",
                email: normalizedEmail,
                phone_number: "",
                shipping_mark: "SUPER ADMIN",
                is_verified: true,
                account_status: "approved",
                created_at: now,
                updated_at: now,
              };
              setDoc(userDocRef, autoProfile).catch((err) =>
                console.error("Failed to auto-provision super admin profile:", err)
              );
              setDbUser({
                id: firebaseUser.uid,
                ...autoProfile,
              });
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
