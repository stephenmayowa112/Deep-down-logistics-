import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth, db, createSecondaryAuthUser, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  updatePassword,
  EmailAuthProvider,
  linkWithCredential,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
} from "firebase/firestore";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  LogOut,
  Package,
  Search,
  FileSpreadsheet,
  Download,
  CheckCircle,
  Settings,
  Pencil,
  Check,
  X,
  Plus,
  Phone,
  ShieldCheck,
  Shield,
  Users,
  Trash2,
  History,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { AccountStatus, PricingSettings, Role, Shipment, ShipmentStatus, User } from "../types";
import { generateAdminManifestPDF, generateClientManifestPDF } from "../utils/pdfGenerator";
import { generatePackingListImage } from "../utils/packingListImageGenerator";
import { parseManifestRows, readManifestFile } from "../utils/manifestParser";

const DEFAULT_SETTINGS: PricingSettings = {
  exchangeRateUsdNgn: 1500,
  seaFreightRateUsd: 180,
  seaClearingRateNgn: 300000,
  airFreightRateUsd: 8,
  airClearingRateNgn: 15000,
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function sendPackingListWhatsApp(shipment: Shipment, status: string, settings: PricingSettings): Promise<Response> {
  const image_base64 = await blobToBase64(await generatePackingListImage(shipment, settings));
  return fetch("/api/notify-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone_number: shipment.phone_number,
      shipping_mark: shipment.shipping_mark,
      tracking_id: shipment.tracking_id,
      container_number: shipment.container_id,
      ctn: shipment.ctn,
      cbm: shipment.cbm,
      freight_usd_per_cbm: shipment.freight_usd_per_cbm,
      clearing_naira_per_cbm: shipment.clearing_naira_per_cbm,
      status,
      image_base64,
    }),
  });
}

function getEffectiveAccountStatus(account: User): AccountStatus {
  if (account.account_status) return account.account_status;
  return account.is_verified ? "approved" : "pending";
}

export default function AdminDashboard() {
  const { user, dbUser } = useAuth();
  const isSuperAdmin = dbUser?.role === "super_admin";

  const adminEmail = user?.email || dbUser?.email || "";
  const adminMark =
    dbUser?.shipping_mark && dbUser.shipping_mark !== "ADMIN" ? dbUser.shipping_mark : "";
  const adminDisplayName =
    adminMark && adminEmail
      ? `${adminMark} (${adminEmail})`
      : adminEmail || adminMark || (isSuperAdmin ? "Super Admin" : "Admin");

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  // Inline phone editing state
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // Delete confirmation states (Super Admin only)
  const [confirmDeleteShipmentId, setConfirmDeleteShipmentId] = useState<string | null>(null);
  const [deletingShipmentId, setDeletingShipmentId] = useState<string | null>(null);
  const [confirmDeleteContainerId, setConfirmDeleteContainerId] = useState<string | null>(null);
  const [deletingContainerId, setDeletingContainerId] = useState<string | null>(null);

  // Full Edit Shipment modal state (for Base Admin & Super Admin record modifications)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [savingShipmentEdit, setSavingShipmentEdit] = useState(false);
  const [editShipmentForm, setEditShipmentForm] = useState<{
    container_id: string;
    shipping_mark: string;
    phone_number: string;
    ctn: string;
    cbm: string;
    freight_usd_per_cbm: string;
    clearing_naira_per_cbm: string;
    status: ShipmentStatus;
  }>({
    container_id: "",
    shipping_mark: "",
    phone_number: "",
    ctn: "1",
    cbm: "0.5",
    freight_usd_per_cbm: "",
    clearing_naira_per_cbm: "",
    status: "received_china",
  });

  // Manual Add Shipment modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [newShipmentForm, setNewShipmentForm] = useState<{
    container_id: string;
    shipping_mark: string;
    phone_number: string;
    ctn: string;
    cbm: string;
    freight_usd_per_cbm: string;
    clearing_naira_per_cbm: string;
    status: ShipmentStatus;
  }>({
    container_id: "",
    shipping_mark: "",
    phone_number: "",
    ctn: "1",
    cbm: "0.5",
    freight_usd_per_cbm: "",
    clearing_naira_per_cbm: "",
    status: "received_china",
  });

  // Accounts management state (Super Admin)
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountRoleFilter, setAccountRoleFilter] = useState<"all" | Role>("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState<"all" | AccountStatus>("all");
  const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null);
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<User | null>(null);
  const [editAccountForm, setEditAccountForm] = useState({
    shipping_mark: "",
    phone_number: "",
    role: "client" as Role,
    account_status: "approved" as AccountStatus,
  });
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountForm, setCreateAccountForm] = useState({
    email: "eyeretega@gmail.com",
    password: "",
    shipping_mark: "SUPER ADMIN",
    phone_number: "",
    role: "super_admin" as Role,
    account_status: "approved" as AccountStatus,
  });

  // Settings state
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [testWhatsAppPhone, setTestWhatsAppPhone] = useState("");
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  // Account password setup/update state
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [savingAccountPassword, setSavingAccountPassword] = useState(false);
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false);
  const [hasPasswordLinked, setHasPasswordLinked] = useState(() =>
    Boolean(user?.providerData.some((p) => p.providerId === "password"))
  );

  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"shipments" | "accounts" | "settings">("shipments");
  const [manifestModal, setManifestModal] = useState<{
    isOpen: boolean;
    containerId: string;
    shipments: Shipment[];
  }>({ isOpen: false, containerId: "", shipments: [] });
  const [manifestOptions, setManifestOptions] = useState({
    loadedDate: "",
    departureDate: "",
    exchangeRate: "",
    freightRate: "",
    clearingRate: "",
  });

  useEffect(() => {
    const settingsRef = doc(db, "settings", "pricing");
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<PricingSettings>;
          setSettings({
            exchangeRateUsdNgn: Number(data.exchangeRateUsdNgn) || DEFAULT_SETTINGS.exchangeRateUsdNgn,
            seaFreightRateUsd: Number(data.seaFreightRateUsd) || DEFAULT_SETTINGS.seaFreightRateUsd,
            seaClearingRateNgn: Number(data.seaClearingRateNgn) || DEFAULT_SETTINGS.seaClearingRateNgn,
            airFreightRateUsd: Number(data.airFreightRateUsd) || DEFAULT_SETTINGS.airFreightRateUsd,
            airClearingRateNgn: Number(data.airClearingRateNgn) || DEFAULT_SETTINGS.airClearingRateNgn,
            updated_at: data.updated_at,
            last_modified_by: data.last_modified_by,
            last_modified_by_email: data.last_modified_by_email,
          });
        } else {
          setDoc(settingsRef, DEFAULT_SETTINGS).catch((err) =>
            console.error("Failed to initialize default pricing settings:", err)
          );
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, "settings/pricing");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "shipments"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Shipment[];
        setShipments(data);
        setLoading(false);
      },
      (error) => {
        toast.error("Failed to load shipments");
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, "shipments");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoadingAccounts(true);
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as User[];
        list.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        setAccounts(list);
        setLoadingAccounts(false);
      },
      (error) => {
        setLoadingAccounts(false);
        handleFirestoreError(error, OperationType.LIST, "users");
      }
    );
    return () => unsubscribe();
  }, [isSuperAdmin]);

  const testWhatsApp = async () => {
    if (!testWhatsAppPhone) return toast.error("Please enter a phone number");
    setTestingWhatsApp(true);
    try {
      const res = await sendPackingListWhatsApp(
        {
          id: "test",
          phone_number: testWhatsAppPhone,
          shipping_mark: "TEST-MARK-001",
          tracking_id: "DDL-TEST-12345",
          container_id: "TESTU1234567",
          ctn: 1,
          cbm: 0.5,
          freight_usd_per_cbm: 180,
          clearing_naira_per_cbm: 300000,
          status: "shipped",
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        "shipped",
        settings
      );
      const data = await res.json();
      if (res.ok && data.sent) {
        toast.success("Test WhatsApp message sent!");
      } else {
        toast.error(data.error || "Failed to send message");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const handleSetAccountPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newAccountPassword.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }
    setSavingAccountPassword(true);
    try {
      const alreadyHasPassword = user.providerData.some((p) => p.providerId === "password");
      if (!alreadyHasPassword && user.email) {
        const credential = EmailAuthProvider.credential(user.email, newAccountPassword);
        await linkWithCredential(user, credential);
      } else {
        await updatePassword(user, newAccountPassword);
      }
      setHasPasswordLinked(true);
      setNewAccountPassword("");
      toast.success(`Password saved for ${user.email}! You can now sign in with Email & Password.`);
    } catch (err: any) {
      if (err?.code === "auth/requires-recent-login" && user.email) {
        try {
          await sendPasswordResetEmail(auth, user.email);
          toast.info(
            `For security, Firebase sent a password setup link to ${user.email}. Click the link in your email to finish setting your password.`
          );
        } catch {
          toast.error("Please click 'Send Password Setup Email' below to set your password.");
        }
      } else if (err?.code === "auth/provider-already-linked") {
        try {
          await updatePassword(user, newAccountPassword);
          setHasPasswordLinked(true);
          setNewAccountPassword("");
          toast.success(`Password updated for ${user.email}!`);
        } catch (updateErr: any) {
          toast.error(updateErr?.message || "Could not update password. Try sending the password setup email.");
        }
      } else {
        toast.error(err?.message || "Failed to set password");
      }
    } finally {
      setSavingAccountPassword(false);
    }
  };

  const handleSendPasswordEmailFromDashboard = async () => {
    if (!user?.email) return;
    setSendingPasswordEmail(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success(`Password setup link sent to ${user.email}! Check your inbox.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send password setup email");
    } finally {
      setSendingPasswordEmail(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const now = Date.now();
    const payload: PricingSettings = {
      exchangeRateUsdNgn: Math.max(0, Number(settings.exchangeRateUsdNgn) || 0),
      seaFreightRateUsd: Math.max(0, Number(settings.seaFreightRateUsd) || 0),
      seaClearingRateNgn: Math.max(0, Number(settings.seaClearingRateNgn) || 0),
      airFreightRateUsd: Math.max(0, Number(settings.airFreightRateUsd) || 0),
      airClearingRateNgn: Math.max(0, Number(settings.airClearingRateNgn) || 0),
      updated_at: now,
      last_modified_by: adminDisplayName.slice(0, 200),
      last_modified_by_email: adminEmail.slice(0, 200),
    };
    try {
      await setDoc(doc(db, "settings", "pricing"), payload);
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error("Failed to save settings");
      handleFirestoreError(err, OperationType.WRITE, "settings/pricing");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSavePhone = async (shipmentId: string) => {
    setSavingPhone(true);
    const cleaned = editingPhoneValue.trim().slice(0, 40);
    const path = `shipments/${shipmentId}`;
    const now = Date.now();
    try {
      await updateDoc(doc(db, "shipments", shipmentId), {
        phone_number: cleaned,
        updated_at: now,
        last_modified_by: adminDisplayName.slice(0, 200),
        last_modified_by_email: adminEmail.slice(0, 200),
        last_modified_by_role: dbUser?.role || "admin",
        last_modified_action: (cleaned
          ? `Updated WhatsApp contact to ${cleaned}`
          : "Cleared WhatsApp contact"
        ).slice(0, 250),
      });
      toast.success(cleaned ? "Customer WhatsApp number updated" : "Phone number cleared");
      setEditingPhoneId(null);
    } catch (error) {
      toast.error("Failed to update phone number");
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setSavingPhone(false);
    }
  };

  const openEditShipmentModal = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setEditShipmentForm({
      container_id: shipment.container_id || "",
      shipping_mark: shipment.shipping_mark || "",
      phone_number: shipment.phone_number || "",
      ctn: String(shipment.ctn ?? 1),
      cbm: String(shipment.cbm ?? 0.5),
      freight_usd_per_cbm:
        shipment.freight_usd_per_cbm !== undefined ? String(shipment.freight_usd_per_cbm) : "",
      clearing_naira_per_cbm:
        shipment.clearing_naira_per_cbm !== undefined ? String(shipment.clearing_naira_per_cbm) : "",
      status: shipment.status,
    });
  };

  const handleUpdateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;
    if (!editShipmentForm.shipping_mark.trim()) {
      return toast.error("Shipping Mark is required");
    }
    if (!editShipmentForm.container_id.trim()) {
      return toast.error("Container Number is required");
    }

    setSavingShipmentEdit(true);
    const path = `shipments/${editingShipment.id}`;
    try {
      const ctn = Math.max(0, parseInt(editShipmentForm.ctn, 10) || 0);
      const cbm = Math.max(0, parseFloat(editShipmentForm.cbm) || 0);
      const containerId = editShipmentForm.container_id.trim().slice(0, 64);
      const shippingMark = editShipmentForm.shipping_mark.trim().slice(0, 128);
      const phoneNumber = editShipmentForm.phone_number.trim().slice(0, 40);
      const newStatus = editShipmentForm.status;

      const freightRaw = editShipmentForm.freight_usd_per_cbm.trim();
      const clearingRaw = editShipmentForm.clearing_naira_per_cbm.trim();
      const freightUsd = freightRaw !== "" ? Math.max(0, parseFloat(freightRaw) || 0) : undefined;
      const clearingNgn = clearingRaw !== "" ? Math.max(0, parseFloat(clearingRaw) || 0) : undefined;

      const changes: string[] = [];
      if (containerId !== editingShipment.container_id) changes.push(`Container (${editingShipment.container_id} → ${containerId})`);
      if (shippingMark !== editingShipment.shipping_mark) changes.push(`Mark (${editingShipment.shipping_mark} → ${shippingMark})`);
      if (phoneNumber !== editingShipment.phone_number) changes.push(`Phone`);
      if (ctn !== editingShipment.ctn) changes.push(`CTN (${editingShipment.ctn} → ${ctn})`);
      if (cbm !== editingShipment.cbm) changes.push(`CBM (${editingShipment.cbm} → ${cbm})`);
      if (newStatus !== editingShipment.status) changes.push(`Status (${newStatus.replace(/_/g, " ").toUpperCase()})`);
      if (freightUsd !== editingShipment.freight_usd_per_cbm) changes.push(`Freight rate`);
      if (clearingNgn !== editingShipment.clearing_naira_per_cbm) changes.push(`Clearing rate`);

      const actionSummary =
        changes.length > 0
          ? `Modified ${changes.join(", ")}`.slice(0, 250)
          : "Modified shipment record";

      const now = Date.now();
      const updatePayload: Record<string, unknown> = {
        container_id: containerId,
        shipping_mark: shippingMark,
        phone_number: phoneNumber,
        ctn,
        cbm,
        status: newStatus,
        updated_at: now,
        last_modified_by: adminDisplayName.slice(0, 200),
        last_modified_by_email: adminEmail.slice(0, 200),
        last_modified_by_role: dbUser?.role || "admin",
        last_modified_action: actionSummary,
        freight_usd_per_cbm: freightUsd !== undefined ? freightUsd : deleteField(),
        clearing_naira_per_cbm: clearingNgn !== undefined ? clearingNgn : deleteField(),
      };

      const batch = writeBatch(db);
      batch.update(doc(db, "shipments", editingShipment.id), updatePayload);

      const updateRef = doc(collection(db, "tracking_updates"));
      batch.set(updateRef, {
        shipment_id: editingShipment.id,
        status: newStatus,
        note: `${actionSummary} by ${adminDisplayName}`.slice(0, 500),
        created_at: now,
        modified_by: adminDisplayName.slice(0, 200),
        modified_by_email: adminEmail.slice(0, 200),
      });

      await batch.commit();
      toast.success(`Shipment ${editingShipment.tracking_id} updated`);

      if (newStatus === "shipped" && editingShipment.status !== "shipped" && phoneNumber) {
        notifyStatusByWhatsApp(
          {
            ...editingShipment,
            container_id: containerId,
            shipping_mark: shippingMark,
            phone_number: phoneNumber,
            ctn,
            cbm,
            freight_usd_per_cbm: freightUsd,
            clearing_naira_per_cbm: clearingNgn,
            status: newStatus,
          },
          "shipped"
        );
      }

      setEditingShipment(null);
    } catch (error) {
      toast.error("Failed to modify shipment");
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setSavingShipmentEdit(false);
    }
  };

  const handleDeleteShipment = async (shipment: Shipment) => {
    if (!isSuperAdmin) {
      toast.error("Only a Super Admin can delete records.");
      return;
    }
    setDeletingShipmentId(shipment.id);
    const path = `shipments/${shipment.id}`;
    try {
      await deleteDoc(doc(db, "shipments", shipment.id));
      toast.success(`Deleted shipment ${shipment.tracking_id} (${shipment.shipping_mark})`);
      setConfirmDeleteShipmentId(null);
    } catch (error) {
      toast.error("Failed to delete shipment");
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setDeletingShipmentId(null);
    }
  };

  const handleDeleteContainer = async (containerId: string, containerShipments: Shipment[]) => {
    if (!isSuperAdmin) {
      toast.error("Only a Super Admin can delete records.");
      return;
    }
    setDeletingContainerId(containerId);
    try {
      const batch = writeBatch(db);
      containerShipments.forEach((s) => {
        batch.delete(doc(db, "shipments", s.id));
      });
      await batch.commit();
      toast.success(`Deleted ${containerShipments.length} shipments in container ${containerId}`);
      setConfirmDeleteContainerId(null);
    } catch (error) {
      toast.error("Failed to delete container shipments");
      handleFirestoreError(error, OperationType.DELETE, "shipments");
    } finally {
      setDeletingContainerId(null);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipmentForm.shipping_mark.trim()) {
      return toast.error("Shipping Mark is required");
    }
    if (!newShipmentForm.container_id.trim()) {
      return toast.error("Container Number is required");
    }

    setCreatingShipment(true);
    try {
      const ctn = Math.max(0, parseInt(newShipmentForm.ctn, 10) || 1);
      const cbm = Math.max(0, parseFloat(newShipmentForm.cbm) || 0.1);
      const freightUsd = newShipmentForm.freight_usd_per_cbm
        ? Math.max(0, parseFloat(newShipmentForm.freight_usd_per_cbm))
        : undefined;
      const clearingNgn = newShipmentForm.clearing_naira_per_cbm
        ? Math.max(0, parseFloat(newShipmentForm.clearing_naira_per_cbm))
        : undefined;

      const trackingId = `DDL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const shipmentRef = doc(collection(db, "shipments"));
      const now = Date.now();
      const shipmentData: Omit<Shipment, "id"> = {
        tracking_id: trackingId,
        container_id: newShipmentForm.container_id.trim().slice(0, 64),
        shipping_mark: newShipmentForm.shipping_mark.trim().slice(0, 128),
        phone_number: newShipmentForm.phone_number.trim().slice(0, 40),
        ctn,
        cbm,
        ...(freightUsd !== undefined && !isNaN(freightUsd) ? { freight_usd_per_cbm: freightUsd } : {}),
        ...(clearingNgn !== undefined && !isNaN(clearingNgn) ? { clearing_naira_per_cbm: clearingNgn } : {}),
        status: newShipmentForm.status,
        created_at: now,
        updated_at: now,
        last_modified_by: adminDisplayName.slice(0, 200),
        last_modified_by_email: adminEmail.slice(0, 200),
        last_modified_by_role: dbUser?.role || "admin",
        last_modified_action: `Created shipment in container ${newShipmentForm.container_id.trim()}`.slice(0, 250),
      };

      const batch = writeBatch(db);
      batch.set(shipmentRef, shipmentData);

      const updateRef = doc(collection(db, "tracking_updates"));
      batch.set(updateRef, {
        shipment_id: shipmentRef.id,
        status: newShipmentForm.status,
        note: `Shipment created for container ${shipmentData.container_id} by ${adminDisplayName}`.slice(0, 500),
        created_at: now,
        modified_by: adminDisplayName.slice(0, 200),
        modified_by_email: adminEmail.slice(0, 200),
      });

      await batch.commit();
      const createdShipment: Shipment = { id: shipmentRef.id, ...shipmentData };

      toast.success(`Shipment ${createdShipment.tracking_id} added`);
      setIsAddModalOpen(false);
      setNewShipmentForm({
        container_id: "",
        shipping_mark: "",
        phone_number: "",
        ctn: "1",
        cbm: "0.5",
        freight_usd_per_cbm: "",
        clearing_naira_per_cbm: "",
        status: "received_china",
      });

      if (createdShipment.status === "shipped" && createdShipment.phone_number) {
        notifyStatusByWhatsApp(createdShipment, "shipped");
      }
    } catch (error) {
      toast.error("Failed to create shipment");
      handleFirestoreError(error, OperationType.WRITE, "shipments");
    } finally {
      setCreatingShipment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    setUploading(true);
    let parsedRows: ReturnType<typeof parseManifestRows>["shipments"] = [];
    try {
      const { shipments: rows } = parseManifestRows(await readManifestFile(file));
      parsedRows = rows;
    } catch (error) {
      console.error("Manifest parse error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to parse manifest file");
      setUploading(false);
      input.value = "";
      return;
    }

    try {
      const batch = writeBatch(db);
      const now = Date.now();
      for (const row of parsedRows) {
        const shipmentRef = doc(collection(db, "shipments"));
        const sanitizedRow = {
          container_id: String(row.container_id || "UNKNOWN").trim().slice(0, 64),
          shipping_mark: String(row.shipping_mark || "").trim().slice(0, 128),
          phone_number: String(row.phone_number || "").trim().slice(0, 40),
          ctn: Math.max(0, Number(row.ctn) || 0),
          cbm: Math.max(0, Number(row.cbm) || 0),
          ...(row.freight_usd_per_cbm !== undefined
            ? { freight_usd_per_cbm: Math.max(0, Number(row.freight_usd_per_cbm) || 0) }
            : {}),
          ...(row.clearing_naira_per_cbm !== undefined
            ? { clearing_naira_per_cbm: Math.max(0, Number(row.clearing_naira_per_cbm) || 0) }
            : {}),
        };
        batch.set(shipmentRef, {
          ...sanitizedRow,
          tracking_id: `DDL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          status: "received_china",
          created_at: now,
          updated_at: now,
          last_modified_by: adminDisplayName.slice(0, 200),
          last_modified_by_email: adminEmail.slice(0, 200),
          last_modified_by_role: dbUser?.role || "admin",
          last_modified_action: `Imported manifest for container ${sanitizedRow.container_id}`.slice(0, 250),
        });
        batch.set(doc(collection(db, "tracking_updates")), {
          shipment_id: shipmentRef.id,
          status: "received_china",
          note: `Manifest imported for container ${sanitizedRow.container_id} by ${adminDisplayName}`.slice(0, 500),
          created_at: now,
          modified_by: adminDisplayName.slice(0, 200),
          modified_by_email: adminEmail.slice(0, 200),
        });
      }
      await batch.commit();

      toast.success(`Imported ${parsedRows.length} shipments for container ${parsedRows[0].container_id}`);
    } catch (error) {
      toast.error("Failed to save imported manifest to Firestore");
      handleFirestoreError(error, OperationType.WRITE, "shipments");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const notifyStatusByWhatsApp = (shipment: Shipment, status: string) => {
    if (!shipment.phone_number) return;
    if (status !== "shipped") return;

    const sendNow = async () => {
      try {
        const res = await sendPackingListWhatsApp(shipment, status, settings);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.sent) {
          toast.success(`WhatsApp notification sent to ${shipment.shipping_mark || shipment.phone_number}`);
        } else {
          toast.error(data.error || "WhatsApp notification could not be sent");
        }
      } catch (error) {
        console.warn("Failed to send WhatsApp status notification:", error);
      }
    };

    const timeoutId = setTimeout(sendNow, 5000);

    toast(`WhatsApp update will be sent to ${shipment.shipping_mark || shipment.phone_number}`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timeoutId);
          toast.success("WhatsApp notification cancelled");
        },
      },
    });
  };

  const updateStatus = async (shipmentId: string, newStatus: string) => {
    const shipment = shipments.find((s) => s.id === shipmentId);
    const formattedStatus = newStatus.replace(/_/g, " ").toUpperCase();

    try {
      const batch = writeBatch(db);
      const now = Date.now();
      const shipmentRef = doc(db, "shipments", shipmentId);
      batch.update(shipmentRef, {
        status: newStatus,
        updated_at: now,
        last_modified_by: adminDisplayName.slice(0, 200),
        last_modified_by_email: adminEmail.slice(0, 200),
        last_modified_by_role: dbUser?.role || "admin",
        last_modified_action: `Changed status to ${formattedStatus}`.slice(0, 250),
      });

      const updateRef = doc(collection(db, "tracking_updates"));
      batch.set(updateRef, {
        shipment_id: shipmentId,
        status: newStatus,
        note: `Status updated to ${formattedStatus} by ${adminDisplayName}`.slice(0, 500),
        created_at: now,
        modified_by: adminDisplayName.slice(0, 200),
        modified_by_email: adminEmail.slice(0, 200),
      });

      await batch.commit();
      toast.success(`Status updated to ${formattedStatus}`);

      if (shipment) {
        notifyStatusByWhatsApp(shipment, newStatus);
      }
    } catch (error) {
      toast.error("Failed to update status");
      handleFirestoreError(error, OperationType.UPDATE, `shipments/${shipmentId}`);
    }
  };

  const updateContainerStatus = async (containerId: string, newStatus: string) => {
    const shipmentsInContainer = shipments.filter((s) => s.container_id === containerId);
    if (shipmentsInContainer.length === 0) return;
    const formattedStatus = newStatus.replace(/_/g, " ").toUpperCase();

    try {
      const batch = writeBatch(db);
      const now = Date.now();

      shipmentsInContainer.forEach((shipment) => {
        const shipmentRef = doc(db, "shipments", shipment.id);
        batch.update(shipmentRef, {
          status: newStatus,
          updated_at: now,
          last_modified_by: adminDisplayName.slice(0, 200),
          last_modified_by_email: adminEmail.slice(0, 200),
          last_modified_by_role: dbUser?.role || "admin",
          last_modified_action: `Container bulk status updated to ${formattedStatus}`.slice(0, 250),
        });

        const updateRef = doc(collection(db, "tracking_updates"));
        batch.set(updateRef, {
          shipment_id: shipment.id,
          status: newStatus,
          note: `Container ${containerId} status updated to ${formattedStatus} by ${adminDisplayName}`.slice(0, 500),
          created_at: now,
          modified_by: adminDisplayName.slice(0, 200),
          modified_by_email: adminEmail.slice(0, 200),
        });
      });

      await batch.commit();
      toast.success(`Updated ${shipmentsInContainer.length} shipments to ${formattedStatus}`);

      shipmentsInContainer.forEach((shipment) => {
        notifyStatusByWhatsApp(shipment, newStatus);
      });
    } catch (error) {
      toast.error("Failed to update container status");
      handleFirestoreError(error, OperationType.UPDATE, "shipments");
    }
  };

  // Super Admin Account Management handlers
  const handleUpdateAccountStatus = async (targetAccount: User, newStatus: AccountStatus) => {
    if (!isSuperAdmin) return;
    setUpdatingAccountId(targetAccount.id);
    const path = `users/${targetAccount.id}`;
    try {
      await updateDoc(doc(db, "users", targetAccount.id), {
        account_status: newStatus,
        is_verified: newStatus === "approved",
        updated_at: Date.now(),
        last_modified_by: adminDisplayName.slice(0, 200),
        last_modified_by_email: adminEmail.slice(0, 200),
      });
      toast.success(
        `Account ${targetAccount.shipping_mark} status set to ${newStatus.toUpperCase()}`
      );
    } catch (error) {
      toast.error("Failed to update account status");
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleUpdateAccountRole = async (targetAccount: User, newRole: Role) => {
    if (!isSuperAdmin) return;
    setUpdatingAccountId(targetAccount.id);
    const path = `users/${targetAccount.id}`;
    try {
      await updateDoc(doc(db, "users", targetAccount.id), {
        role: newRole,
        updated_at: Date.now(),
        last_modified_by: adminDisplayName.slice(0, 200),
        last_modified_by_email: adminEmail.slice(0, 200),
      });
      toast.success(
        `Updated ${targetAccount.shipping_mark} role to ${newRole.replace(/_/g, " ").toUpperCase()}`
      );
    } catch (error) {
      toast.error("Failed to update account role");
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleSaveAccountModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingAccount) return;
    if (!editAccountForm.shipping_mark.trim()) {
      return toast.error("Shipping mark is required");
    }
    setUpdatingAccountId(editingAccount.id);
    const path = `users/${editingAccount.id}`;
    try {
      await updateDoc(doc(db, "users", editingAccount.id), {
        shipping_mark: editAccountForm.shipping_mark.trim().toUpperCase().slice(0, 100),
        phone_number: editAccountForm.phone_number.trim().slice(0, 40),
        role: editAccountForm.role,
        account_status: editAccountForm.account_status,
        is_verified: editAccountForm.account_status === "approved",
        updated_at: Date.now(),
        last_modified_by: adminDisplayName.slice(0, 200),
        last_modified_by_email: adminEmail.slice(0, 200),
      });
      toast.success(`Account ${editAccountForm.shipping_mark.toUpperCase()} updated`);
      setEditingAccount(null);
    } catch (error) {
      toast.error("Failed to update account");
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleDeleteAccount = async (targetAccount: User) => {
    if (!isSuperAdmin) return;
    if (targetAccount.id === user?.uid) {
      return toast.error("You cannot delete your own active Super Admin account.");
    }
    setUpdatingAccountId(targetAccount.id);
    const path = `users/${targetAccount.id}`;
    try {
      await deleteDoc(doc(db, "users", targetAccount.id));
      toast.success(`Deleted account ${targetAccount.shipping_mark}`);
      setConfirmDeleteAccountId(null);
    } catch (error) {
      toast.error("Failed to delete account");
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    const cleanedEmail = createAccountForm.email.toLowerCase().trim();
    if (!cleanedEmail) {
      return toast.error("Email address is required");
    }
    if (createAccountForm.password.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }
    const defaultMark =
      createAccountForm.role === "super_admin"
        ? "SUPER ADMIN"
        : createAccountForm.role === "admin"
        ? "ADMIN"
        : "CLIENT";
    const cleanedMark = (createAccountForm.shipping_mark.trim().toUpperCase() || defaultMark).slice(0, 100);

    setCreatingAccount(true);
    try {
      const newUid = await createSecondaryAuthUser(cleanedEmail, createAccountForm.password);
      const now = Date.now();
      await setDoc(doc(db, "users", newUid), {
        role: createAccountForm.role,
        email: cleanedEmail.slice(0, 200),
        phone_number: createAccountForm.phone_number.trim().slice(0, 40),
        shipping_mark: cleanedMark,
        is_verified: createAccountForm.account_status === "approved",
        account_status: createAccountForm.account_status,
        created_at: now,
        updated_at: now,
        last_modified_by: adminDisplayName.slice(0, 200),
        last_modified_by_email: adminEmail.slice(0, 200),
      });
      toast.success(
        `Created ${createAccountForm.role.replace(/_/g, " ").toUpperCase()} account for ${cleanedEmail}`
      );
      setIsCreateAccountModalOpen(false);
      setCreateAccountForm({
        email: "",
        password: "",
        shipping_mark: "",
        phone_number: "",
        role: "client",
        account_status: "approved",
      });
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        const existingAcc = accounts.find(
          (a) => a.email?.toLowerCase().trim() === cleanedEmail
        );
        if (existingAcc) {
          await updateDoc(doc(db, "users", existingAcc.id), {
            role: createAccountForm.role,
            account_status: createAccountForm.account_status,
            is_verified: createAccountForm.account_status === "approved",
            updated_at: Date.now(),
            last_modified_by: adminDisplayName.slice(0, 200),
            last_modified_by_email: adminEmail.slice(0, 200),
          });
        }
        try {
          await sendPasswordResetEmail(auth, cleanedEmail);
          toast.info(
            `${cleanedEmail} already exists in Firebase Auth. Role set to ${createAccountForm.role
              .replace(/_/g, " ")
              .toUpperCase()} and a password setup link was emailed to ${cleanedEmail}.`
          );
          setIsCreateAccountModalOpen(false);
        } catch {
          toast.error(`${cleanedEmail} is already registered. Have them sign in or use Set / Reset password on the login page.`);
        }
      } else {
        toast.error(err?.message || "Failed to create account");
      }
    } finally {
      setCreatingAccount(false);
    }
  };

  const filteredShipments = shipments.filter(
    (s) =>
      s.tracking_id.toLowerCase().includes(search.toLowerCase()) ||
      s.shipping_mark.toLowerCase().includes(search.toLowerCase()) ||
      s.phone_number.includes(search) ||
      (s.last_modified_by && s.last_modified_by.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredAccounts = accounts.filter((acc) => {
    const status = getEffectiveAccountStatus(acc);
    if (accountRoleFilter !== "all" && acc.role !== accountRoleFilter) return false;
    if (accountStatusFilter !== "all" && status !== accountStatusFilter) return false;
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    return (
      acc.shipping_mark?.toLowerCase().includes(q) ||
      acc.email?.toLowerCase().includes(q) ||
      acc.phone_number?.toLowerCase().includes(q) ||
      acc.id.toLowerCase().includes(q)
    );
  });

  const pendingAccountsCount = accounts.filter(
    (a) => getEffectiveAccountStatus(a) === "pending"
  ).length;

  const getStatusColor = (status: string) => {
    if (status.includes("delivered")) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (status.includes("cleared") || status.includes("ready"))
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (status.includes("transit")) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (status.includes("received_china")) return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    return "bg-slate-200 text-slate-700 border-transparent";
  };

  const getAccountStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "suspended":
        return "bg-red-50 text-red-700 border-red-200";
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "super_admin":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "admin":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const allStatuses: ShipmentStatus[] = [
    "received_china",
    "shipped",
    "in_transit_sea",
    "in_transit_air",
    "arrived_lagos",
    "customs_clearing",
    "cleared",
    "ready_for_pickup",
    "out_for_delivery",
    "delivered",
  ];

  const groupedShipments: [string, Shipment[]][] = Object.entries(
    filteredShipments.reduce<Record<string, Shipment[]>>((acc, shipment) => {
      const key = shipment.container_id || "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(shipment);
      return acc;
    }, {})
  );

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-700 flex flex-col font-sans overflow-x-clip">
      <Helmet>
        <title>
          {isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"} - Deep Down Logistics
        </title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Top Header */}
      <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 bg-white shrink-0">
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-90 transition-opacity min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/15 shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-slate-900 truncate">Deep Down Logistics</span>
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isSuperAdmin
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {isSuperAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            {isSuperAdmin ? "Super Admin" : "Base Admin"}
          </span>
          <span className="text-xs font-medium text-slate-600 hidden md:block truncate max-w-[220px]">
            {adminDisplayName}
          </span>
          <button
            onClick={() => auth.signOut()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center gap-6 overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveTab("shipments")}
          className={`min-h-[44px] inline-flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "shipments"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Package className="w-4 h-4" />
          Shipments
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("accounts")}
            className={`min-h-[44px] inline-flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "accounts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Users className="w-4 h-4" />
            Accounts &amp; Roles
            {pendingAccountsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                {pendingAccountsCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab("settings")}
          className={`min-h-[44px] inline-flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "settings"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Base Admin Notice Banner */}
        {!isSuperAdmin && (
          <div className="mb-4 bg-blue-50/90 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-blue-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Base Admin Mode:</strong> You can create and modify shipment records. All modifications are tagged with your admin profile (<strong>{adminDisplayName}</strong>) for other admins to see. Deleting records is restricted to Super Admins.
              </span>
            </div>
          </div>
        )}

        {/* Google-only Admin Account Password Setup Banner */}
        {user && !hasPasswordLinked && !user.providerData.some((p) => p.providerId === "password") && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Create a Password for {user.email}
              </h3>
              <p className="text-xs text-indigo-800 mt-0.5">
                Your account was created with Google Auth. Set a password below so you can sign in directly with Email &amp; Password.
              </p>
            </div>
            <form onSubmit={handleSetAccountPassword} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <input
                type="password"
                required
                minLength={6}
                placeholder="New password (min. 6 chars)"
                value={newAccountPassword}
                onChange={(e) => setNewAccountPassword(e.target.value)}
                className="px-3 py-2 min-h-[44px] sm:min-h-[38px] text-base sm:text-xs bg-white border border-indigo-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <button
                type="submit"
                disabled={savingAccountPassword}
                className="px-3.5 py-2 min-h-[44px] sm:min-h-[38px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingAccountPassword ? "Saving..." : "Set Password"}
              </button>
              <button
                type="button"
                disabled={sendingPasswordEmail}
                onClick={handleSendPasswordEmailFromDashboard}
                className="px-3 py-2 min-h-[44px] sm:min-h-[38px] bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {sendingPasswordEmail ? "Sending..." : "Email Setup Link"}
              </button>
            </form>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 max-w-2xl w-full">
            <div className="mb-8 border-b border-slate-100 pb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Account Password ({user?.email})</h2>
              <p className="text-xs text-slate-500 mb-4">
                Set or update the password for your account so you can log in with Email &amp; Password.
              </p>
              <form onSubmit={handleSetAccountPassword} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Enter new password (min. 6 chars)"
                  value={newAccountPassword}
                  onChange={(e) => setNewAccountPassword(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 flex-1 sm:max-w-xs"
                />
                <button
                  type="submit"
                  disabled={savingAccountPassword || newAccountPassword.length < 6}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingAccountPassword ? "Saving..." : "Save Password"}
                </button>
                <button
                  type="button"
                  disabled={sendingPasswordEmail}
                  onClick={handleSendPasswordEmailFromDashboard}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {sendingPasswordEmail ? "Sending..." : "Send Setup Link to Email"}
                </button>
              </form>
            </div>

            <div className="mb-8 border-b border-slate-100 pb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">WhatsApp Integration</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="Phone Number (e.g. 2348012345678)"
                  value={testWhatsAppPhone}
                  onChange={(e) => setTestWhatsAppPhone(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-emerald-500 flex-1 sm:max-w-xs"
                />
                <button
                  onClick={testWhatsApp}
                  disabled={testingWhatsApp || !testWhatsAppPhone}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {testingWhatsApp ? "Sending..." : "Send Test Message"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                This will send a sample &ldquo;Shipped&rdquo; status update using the template configured in WHATSAPP_TEMPLATE_NAME.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Pricing &amp; Calculator Settings</h2>
              {settings.last_modified_by && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  Last modified by <strong className="text-slate-700">{settings.last_modified_by}</strong>
                  {settings.updated_at ? ` • ${format(settings.updated_at, "MMM d, h:mm a")}` : ""}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Exchange Rate (USD to NGN)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={settings.exchangeRateUsdNgn}
                    onChange={(e) => setSettings({ ...settings, exchangeRateUsdNgn: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                  />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-medium text-slate-800 mb-3">Sea Freight</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Freight Rate per CBM (USD)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={settings.seaFreightRateUsd}
                      onChange={(e) => setSettings({ ...settings, seaFreightRateUsd: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Clearing Rate per CBM (NGN)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={settings.seaClearingRateNgn}
                      onChange={(e) => setSettings({ ...settings, seaClearingRateNgn: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-medium text-slate-800 mb-3">Air Freight</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Freight Rate per Kg (USD)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={settings.airFreightRateUsd}
                      onChange={(e) => setSettings({ ...settings, airFreightRateUsd: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Clearing Rate per Kg (NGN)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={settings.airClearingRateNgn}
                      onChange={(e) => setSettings({ ...settings, airClearingRateNgn: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUPER ADMIN: ACCOUNTS & ROLES TAB */}
        {activeTab === "accounts" && isSuperAdmin && (
          <div className="space-y-5">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs font-medium text-slate-500">Total Accounts</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{accounts.length}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs font-medium text-slate-500">Client Accounts</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {accounts.filter((a) => a.role === "client").length}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs font-medium text-slate-500">Admins &amp; Super Admins</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1 tabular-nums">
                  {accounts.filter((a) => a.role === "admin" || a.role === "super_admin").length}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs font-medium text-slate-500">Pending / Suspended</div>
                <div className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
                  {accounts.filter((a) => getEffectiveAccountStatus(a) !== "approved").length}
                </div>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div>
                <h1 className="text-base font-semibold text-slate-900">Platform Accounts</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Approve accounts, edit client or admin statuses and roles, or delete accounts.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search mark, email, phone..."
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 min-h-[44px] sm:min-h-[40px] bg-slate-50 border border-slate-200 rounded-lg text-base sm:text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                  <select
                    value={accountRoleFilter}
                    onChange={(e) => setAccountRoleFilter(e.target.value as "all" | Role)}
                    className="min-h-[44px] sm:min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <option value="all">All Roles</option>
                    <option value="client">Clients</option>
                    <option value="admin">Base Admins</option>
                    <option value="super_admin">Super Admins</option>
                  </select>

                  <select
                    value={accountStatusFilter}
                    onChange={(e) => setAccountStatusFilter(e.target.value as "all" | AccountStatus)}
                    className="min-h-[44px] sm:min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Approval</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const hasEyeretega = accounts.some(
                      (a) => a.email?.toLowerCase().trim() === "eyeretega@gmail.com"
                    );
                    setCreateAccountForm({
                      email: hasEyeretega ? "" : "eyeretega@gmail.com",
                      password: "",
                      shipping_mark: hasEyeretega ? "" : "SUPER ADMIN",
                      phone_number: "",
                      role: "super_admin",
                      account_status: "approved",
                    });
                    setIsCreateAccountModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-[40px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Create Account
                </button>
              </div>
            </div>

            {/* Accounts List — Mobile Cards (md:hidden) + Desktop Table (hidden md:block) */}
            {loadingAccounts ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 flex justify-center shadow-sm">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500 shadow-sm">
                No accounts match your filter criteria.
              </div>
            ) : (
              <>
                {/* Mobile Card Layout for Accounts */}
                <div className="md:hidden space-y-3 pb-4">
                  {filteredAccounts.map((acc) => {
                    const effectiveStatus = getEffectiveAccountStatus(acc);
                    const isSelf = acc.id === user?.uid;

                    return (
                      <div
                        key={acc.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-slate-900 break-all">
                                {acc.shipping_mark}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono truncate mt-0.5">
                              {acc.email || `UID: ${acc.id.slice(0, 12)}...`}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${getRoleBadge(
                                acc.role
                              )}`}
                            >
                              {acc.role.replace(/_/g, " ")}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${getAccountStatusBadge(
                                effectiveStatus
                              )}`}
                            >
                              {effectiveStatus}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-200/80">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            WhatsApp
                          </span>
                          <span className="font-mono text-slate-800">
                            {acc.phone_number || <span className="text-slate-400 italic">No phone</span>}
                          </span>
                        </div>

                        {acc.last_modified_by && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Updated by {acc.last_modified_by}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                              Role
                            </label>
                            <select
                              value={acc.role}
                              disabled={updatingAccountId === acc.id || isSelf}
                              onChange={(e) => handleUpdateAccountRole(acc, e.target.value as Role)}
                              className="w-full min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                            >
                              <option value="client">Client</option>
                              <option value="admin">Base Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                              Status
                            </label>
                            <select
                              value={effectiveStatus}
                              disabled={updatingAccountId === acc.id || isSelf}
                              onChange={(e) =>
                                handleUpdateAccountStatus(acc, e.target.value as AccountStatus)
                              }
                              className="w-full min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                            >
                              <option value="approved">Approved</option>
                              <option value="pending">Pending</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {effectiveStatus !== "approved" && (
                            <button
                              onClick={() => handleUpdateAccountStatus(acc, "approved")}
                              disabled={updatingAccountId === acc.id}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditingAccount(acc);
                              setEditAccountForm({
                                shipping_mark: acc.shipping_mark,
                                phone_number: acc.phone_number || "",
                                role: acc.role,
                                account_status: effectiveStatus,
                              });
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 min-h-[42px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit Account
                          </button>

                          {!isSelf && (
                            <>
                              {confirmDeleteAccountId === acc.id ? (
                                <div className="w-full flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                  <span className="text-xs text-red-800 font-medium">
                                    Delete {acc.shipping_mark}?
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleDeleteAccount(acc)}
                                      disabled={updatingAccountId === acc.id}
                                      className="px-3 py-1.5 min-h-[36px] bg-red-600 text-white rounded-md text-xs font-bold cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteAccountId(null)}
                                      className="px-2.5 py-1.5 min-h-[36px] bg-white border border-slate-200 text-slate-600 rounded-md text-xs cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteAccountId(acc.id)}
                                  className="inline-flex items-center justify-center min-w-[42px] min-h-[42px] px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                  title="Delete Account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table Layout for Accounts */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Account / Mark</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Super Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {filteredAccounts.map((acc) => {
                          const effectiveStatus = getEffectiveAccountStatus(acc);
                          const isSelf = acc.id === user?.uid;

                          return (
                            <tr key={acc.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900">{acc.shipping_mark}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                                  {acc.email || `UID: ${acc.id.slice(0, 12)}...`}
                                </div>
                                {acc.last_modified_by && (
                                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <History className="w-3 h-3 text-slate-400" />
                                    Updated by {acc.last_modified_by}
                                  </div>
                                )}
                              </td>

                              <td className="px-4 py-3.5 font-mono text-slate-700">
                                {acc.phone_number || <span className="text-slate-400 italic">No phone</span>}
                              </td>

                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${getRoleBadge(
                                      acc.role
                                    )}`}
                                  >
                                    {acc.role.replace(/_/g, " ")}
                                  </span>
                                  <select
                                    value={acc.role}
                                    disabled={updatingAccountId === acc.id || isSelf}
                                    onChange={(e) => handleUpdateAccountRole(acc, e.target.value as Role)}
                                    className="text-[11px] bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
                                    aria-label="Change account role"
                                  >
                                    <option value="client">Client</option>
                                    <option value="admin">Base Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                  </select>
                                </div>
                              </td>

                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${getAccountStatusBadge(
                                      effectiveStatus
                                    )}`}
                                  >
                                    {effectiveStatus}
                                  </span>
                                  <select
                                    value={effectiveStatus}
                                    disabled={updatingAccountId === acc.id || isSelf}
                                    onChange={(e) =>
                                      handleUpdateAccountStatus(acc, e.target.value as AccountStatus)
                                    }
                                    className="text-[11px] bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
                                    aria-label="Change account status"
                                  >
                                    <option value="approved">Approved</option>
                                    <option value="pending">Pending</option>
                                    <option value="suspended">Suspended</option>
                                  </select>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  {effectiveStatus !== "approved" && (
                                    <button
                                      onClick={() => handleUpdateAccountStatus(acc, "approved")}
                                      disabled={updatingAccountId === acc.id}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      Approve
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setEditingAccount(acc);
                                      setEditAccountForm({
                                        shipping_mark: acc.shipping_mark,
                                        phone_number: acc.phone_number || "",
                                        role: acc.role,
                                        account_status: effectiveStatus,
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                                    title="Edit Account Details"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>

                                  {!isSelf && (
                                    <>
                                      {confirmDeleteAccountId === acc.id ? (
                                        <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                                          <button
                                            onClick={() => handleDeleteAccount(acc)}
                                            disabled={updatingAccountId === acc.id}
                                            className="text-[11px] font-bold text-red-600 hover:text-red-700 px-1.5 cursor-pointer"
                                          >
                                            Confirm Delete
                                          </button>
                                          <button
                                            onClick={() => setConfirmDeleteAccountId(null)}
                                            className="text-[11px] text-slate-500 hover:text-slate-700 px-1 cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmDeleteAccountId(acc.id)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                                          title="Delete Account"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Delete
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SHIPMENTS TAB */}
        {activeTab === "shipments" && (
          <>
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-5 sm:mb-6 shrink-0">
              <div>
                <h1 className="text-base sm:text-sm font-semibold text-slate-900">Overview</h1>
                <div className="text-xs text-slate-600 mt-1">
                  Manage tracking, container manifests, and delivery statuses.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                <div className="relative w-full sm:flex-1 lg:w-64">
                  <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by Mark, ID, Admin..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 min-h-[44px] sm:min-h-[38px] bg-white border border-slate-200 rounded-lg text-base sm:text-xs text-slate-800 focus:outline-none focus:border-slate-600 shadow-sm"
                  />
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      if (filteredShipments.length === 0) {
                        toast.error("No shipments to download");
                        return;
                      }
                      generateAdminManifestPDF(filteredShipments);
                      toast.success("Downloading consolidated manifest PDF...");
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] sm:min-h-[38px] bg-white hover:bg-slate-100 text-slate-800 text-xs font-medium rounded-lg border border-slate-300 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Shipment
                  </button>
                  <label className="col-span-2 sm:col-span-1 cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] sm:min-h-[38px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shadow-sm">
                    {uploading ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    )}
                    Import Manifest
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-4 pb-6">
              {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                  No shipments found.
                </div>
              ) : (
                groupedShipments.map(([containerId, containerShipments]) => (
                  <div key={containerId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            Container: <span className="font-mono">{containerId}</span>
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-600 shrink-0 tabular-nums">
                          {containerShipments.length} {containerShipments.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          onChange={(e) => updateContainerStatus(containerId, e.target.value)}
                          className="flex-1 min-w-[140px] min-h-[44px] text-xs uppercase font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Update All To...
                          </option>
                          {allStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            setManifestModal({ isOpen: true, containerId, shipments: containerShipments });
                            setManifestOptions({
                              loadedDate: "",
                              departureDate: "",
                              exchangeRate: settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toString() : "",
                              freightRate: settings?.seaFreightRateUsd ? settings.seaFreightRateUsd.toString() : "",
                              clearingRate: settings?.seaClearingRateNgn ? settings.seaClearingRateNgn.toString() : "",
                            });
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 min-h-[44px] bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-colors shadow-sm shrink-0"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-500" />
                          Packing List
                        </button>
                        {isSuperAdmin && (
                          <>
                            {confirmDeleteContainerId === containerId ? (
                              <div className="w-full flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                <span className="text-xs font-medium text-red-800">
                                  Delete all {containerShipments.length} shipments?
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDeleteContainer(containerId, containerShipments)}
                                    disabled={deletingContainerId === containerId}
                                    className="px-2.5 py-1.5 min-h-[36px] bg-red-600 text-white rounded-md text-xs font-bold"
                                  >
                                    Delete All
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteContainerId(null)}
                                    className="px-2.5 py-1.5 min-h-[36px] bg-white border border-slate-200 text-slate-600 rounded-md text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteContainerId(containerId)}
                                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors shrink-0"
                                title="Delete entire container (Super Admin)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {containerShipments.map((shipment) => (
                        <div key={shipment.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-mono text-xs text-slate-500 truncate">{shipment.tracking_id}</div>
                              <div className="font-semibold text-sm text-slate-900 mt-0.5 break-words">
                                {shipment.shipping_mark}
                              </div>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap shrink-0 ${getStatusColor(
                                shipment.status
                              )}`}
                            >
                              {shipment.status.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
                            <span className="font-medium text-slate-800">{shipment.cbm} CBM</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>{shipment.ctn} CTN</span>
                          </div>

                          {/* Modification Audit Badge */}
                          {shipment.last_modified_by && (
                            <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg px-3 py-2 text-[11px] text-amber-900 flex items-start gap-2">
                              <History className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <div className="leading-snug">
                                <div>
                                  Modified by <strong className="font-semibold">{shipment.last_modified_by}</strong>
                                </div>
                                {shipment.last_modified_action && (
                                  <div className="text-amber-700 mt-0.5">{shipment.last_modified_action}</div>
                                )}
                                <div className="text-[10px] text-amber-600/90 mt-0.5">
                                  {format(shipment.updated_at, "MMM d, yyyy • h:mm a")}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="pt-0.5">
                            {editingPhoneId === shipment.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="tel"
                                  inputMode="tel"
                                  value={editingPhoneValue}
                                  onChange={(e) => setEditingPhoneValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSavePhone(shipment.id);
                                    if (e.key === "Escape") setEditingPhoneId(null);
                                  }}
                                  placeholder="e.g. 08031234567"
                                  autoFocus
                                  className="flex-1 min-w-0 px-3 py-2 min-h-[44px] text-base border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
                                />
                                <button
                                  onClick={() => handleSavePhone(shipment.id)}
                                  disabled={savingPhone}
                                  className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shrink-0"
                                  title="Save Phone Number"
                                  aria-label="Save Phone Number"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingPhoneId(null)}
                                  disabled={savingPhone}
                                  className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors shrink-0"
                                  title="Cancel"
                                  aria-label="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200/80">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span
                                    className={`text-xs truncate ${
                                      shipment.phone_number ? "text-slate-800 font-mono" : "text-amber-600 italic"
                                    }`}
                                  >
                                    {shipment.phone_number || "No WhatsApp #"}
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingPhoneId(shipment.id);
                                    setEditingPhoneValue(shipment.phone_number || "");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 min-h-[36px] text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors shrink-0"
                                >
                                  <Pencil className="w-3 h-3" />
                                  {shipment.phone_number ? "Edit #" : "Add #"}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {shipment.status !== "delivered" && (
                              <button
                                onClick={() => updateStatus(shipment.id, "delivered")}
                                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-2.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition-colors shrink-0"
                                title="Mark as Delivered"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}

                            <select
                              value={shipment.status}
                              onChange={(e) => updateStatus(shipment.id, e.target.value)}
                              className="flex-1 min-w-[130px] min-h-[44px] text-xs uppercase font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              {allStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status.replace(/_/g, " ")}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => openEditShipmentModal(shipment)}
                              className="inline-flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Modify
                            </button>

                            {isSuperAdmin && (
                              <>
                                {confirmDeleteShipmentId === shipment.id ? (
                                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 min-h-[44px]">
                                    <button
                                      onClick={() => handleDeleteShipment(shipment)}
                                      disabled={deletingShipmentId === shipment.id}
                                      className="text-xs font-bold text-red-600 px-1.5"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteShipmentId(null)}
                                      className="text-xs text-slate-500 px-1"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteShipmentId(shipment.id)}
                                    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shrink-0"
                                    title="Delete Shipment (Super Admin)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:flex bg-white rounded-xl border border-slate-200 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">ID / Mark</th>
                      <th className="px-4 py-3">Client Contact (WhatsApp)</th>
                      <th className="px-4 py-3">Volume</th>
                      <th className="px-4 py-3">Status &amp; Audit Trail</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredShipments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No shipments found.
                        </td>
                      </tr>
                    ) : (
                      groupedShipments.map(([containerId, containerShipments]) => (
                        <React.Fragment key={containerId}>
                          <tr className="bg-slate-50/90 border-y border-slate-200">
                            <td colSpan={4} className="px-4 py-2 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-blue-500" />
                                <span>
                                  Container: <span className="font-mono">{containerId}</span>
                                </span>
                                <span className="text-[10px] text-slate-600 ml-2">
                                  ({containerShipments.length} items)
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-2">
                                <select
                                  onChange={(e) => updateContainerStatus(containerId, e.target.value)}
                                  className="text-[10px] uppercase font-medium bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                                  defaultValue=""
                                >
                                  <option value="" disabled>
                                    Update All To...
                                  </option>
                                  {allStatuses.map((status) => (
                                    <option key={status} value={status}>
                                      {status.replace(/_/g, " ")}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    setManifestModal({ isOpen: true, containerId, shipments: containerShipments });
                                    setManifestOptions({
                                      loadedDate: "",
                                      departureDate: "",
                                      exchangeRate: settings?.exchangeRateUsdNgn
                                        ? settings.exchangeRateUsdNgn.toString()
                                        : "",
                                      freightRate: settings?.seaFreightRateUsd
                                        ? settings.seaFreightRateUsd.toString()
                                        : "",
                                      clearingRate: settings?.seaClearingRateNgn
                                        ? settings.seaClearingRateNgn.toString()
                                        : "",
                                    });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 text-[10px] font-medium rounded border border-slate-300 transition-colors shadow-sm cursor-pointer"
                                >
                                  <Download className="w-3 h-3 text-blue-500" />
                                  Packing List
                                </button>

                                {isSuperAdmin && (
                                  <>
                                    {confirmDeleteContainerId === containerId ? (
                                      <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                                        <button
                                          onClick={() => handleDeleteContainer(containerId, containerShipments)}
                                          disabled={deletingContainerId === containerId}
                                          className="text-[10px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                                        >
                                          Delete All ({containerShipments.length})
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteContainerId(null)}
                                          className="text-[10px] text-slate-500 hover:text-slate-700 ml-1 cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmDeleteContainerId(containerId)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-medium rounded border border-red-200 transition-colors cursor-pointer"
                                        title="Delete entire container (Super Admin)"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {containerShipments.map((shipment) => (
                            <tr key={shipment.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3">
                                <div className="font-mono text-slate-600">{shipment.tracking_id}</div>
                                <div className="font-semibold text-slate-900 mt-0.5">{shipment.shipping_mark}</div>
                              </td>
                              <td className="px-4 py-3">
                                {editingPhoneId === shipment.id ? (
                                  <div className="flex items-center gap-1.5 max-w-[230px]">
                                    <input
                                      type="text"
                                      value={editingPhoneValue}
                                      onChange={(e) => setEditingPhoneValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSavePhone(shipment.id);
                                        if (e.key === "Escape") setEditingPhoneId(null);
                                      }}
                                      placeholder="e.g. 08031234567"
                                      autoFocus
                                      className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
                                    />
                                    <button
                                      onClick={() => handleSavePhone(shipment.id)}
                                      disabled={savingPhone}
                                      className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer"
                                      title="Save Phone Number"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingPhoneId(null)}
                                      disabled={savingPhone}
                                      className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 group">
                                    <span
                                      className={
                                        shipment.phone_number ? "text-slate-800 font-mono" : "text-amber-600 italic"
                                      }
                                    >
                                      {shipment.phone_number || "No WhatsApp #"}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingPhoneId(shipment.id);
                                        setEditingPhoneValue(shipment.phone_number || "");
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                                      title="Edit customer WhatsApp number"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                      {shipment.phone_number ? "Edit" : "Add #"}
                                    </button>
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-500 mt-0.5">{shipment.container_id}</div>
                              </td>
                              <td className="px-4 py-3 tabular-nums">
                                <div className="text-slate-700 font-medium">{shipment.cbm} CBM</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{shipment.ctn} CTN</div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap inline-block ${getStatusColor(
                                    shipment.status
                                  )}`}
                                >
                                  {shipment.status.replace(/_/g, " ").toUpperCase()}
                                </span>
                                {shipment.last_modified_by && (
                                  <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-600 bg-slate-100/90 border border-slate-200/80 rounded-md px-2 py-1 max-w-xs">
                                    <History className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="leading-tight">
                                      <div>
                                        Modified by{" "}
                                        <span className="font-semibold text-slate-900">
                                          {shipment.last_modified_by}
                                        </span>
                                      </div>
                                      {shipment.last_modified_action && (
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                          {shipment.last_modified_action}
                                        </div>
                                      )}
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        {format(shipment.updated_at, "MMM d, h:mm a")}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {shipment.status !== "delivered" && (
                                    <button
                                      onClick={() => updateStatus(shipment.id, "delivered")}
                                      className="text-emerald-600 hover:text-emerald-700 p-1.5 rounded hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                      title="Mark as Delivered"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  <select
                                    value={shipment.status}
                                    onChange={(e) => updateStatus(shipment.id, e.target.value)}
                                    className="text-[10px] uppercase font-medium bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                                  >
                                    {allStatuses.map((status) => (
                                      <option key={status} value={status}>
                                        {status.replace(/_/g, " ")}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => openEditShipmentModal(shipment)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 text-[10px] font-medium transition-colors cursor-pointer"
                                    title="Modify Shipment Record"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Modify
                                  </button>

                                  {isSuperAdmin && (
                                    <>
                                      {confirmDeleteShipmentId === shipment.id ? (
                                        <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded px-2 py-1">
                                          <button
                                            onClick={() => handleDeleteShipment(shipment)}
                                            disabled={deletingShipmentId === shipment.id}
                                            className="text-[10px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                                          >
                                            Confirm
                                          </button>
                                          <button
                                            onClick={() => setConfirmDeleteShipmentId(null)}
                                            className="text-[10px] text-slate-500 hover:text-slate-700 ml-1 cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmDeleteShipmentId(shipment.id)}
                                          className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                          title="Delete Shipment Record (Super Admin)"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* MODIFY SHIPMENT MODAL (Base Admin & Super Admin) */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <form
            onSubmit={handleUpdateShipment}
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Modify Shipment Record</h3>
                <p className="text-xs text-slate-500 font-mono">{editingShipment.tracking_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingShipment(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
                <History className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  This modification will be logged as updated by <strong>{adminDisplayName}</strong> for all admins to see.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Container Number *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500"
                    value={editShipmentForm.container_id}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, container_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Mark *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 uppercase"
                    value={editShipmentForm.shipping_mark}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, shipping_mark: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer WhatsApp Number</label>
                <input
                  type="tel"
                  inputMode="tel"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 font-mono"
                  value={editShipmentForm.phone_number}
                  onChange={(e) => setEditShipmentForm({ ...editShipmentForm, phone_number: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (CTN) *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={editShipmentForm.ctn}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, ctn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Volume (CBM) *</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={editShipmentForm.cbm}
                    onChange={(e) => setEditShipmentForm({ ...editShipmentForm, cbm: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Freight Rate (USD/CBM)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={`Default: ${settings?.seaFreightRateUsd || 180}`}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={editShipmentForm.freight_usd_per_cbm}
                    onChange={(e) =>
                      setEditShipmentForm({ ...editShipmentForm, freight_usd_per_cbm: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clearing Rate (NGN/CBM)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={`Default: ${settings?.seaClearingRateNgn || 300000}`}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={editShipmentForm.clearing_naira_per_cbm}
                    onChange={(e) =>
                      setEditShipmentForm({ ...editShipmentForm, clearing_naira_per_cbm: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editShipmentForm.status}
                  onChange={(e) =>
                    setEditShipmentForm({ ...editShipmentForm, status: e.target.value as ShipmentStatus })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 uppercase bg-white"
                >
                  {allStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingShipment(null)}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors rounded-lg border border-slate-200 sm:border-transparent bg-white sm:bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingShipmentEdit}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {savingShipmentEdit ? "Saving changes..." : "Save Modifications"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE NEW ACCOUNT MODAL (Super Admin) */}
      {isCreateAccountModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <form
            onSubmit={handleCreateAccount}
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Platform Account</h3>
                <p className="text-xs text-slate-500">
                  Create a Super Admin, Base Admin, or Client account with Email &amp; Password
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateAccountModalOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. eyeretega@gmail.com"
                  value={createAccountForm.email}
                  onChange={(e) =>
                    setCreateAccountForm({ ...createAccountForm, email: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password * (min. 6 characters)
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  placeholder="Enter password for this account"
                  value={createAccountForm.password}
                  onChange={(e) =>
                    setCreateAccountForm({ ...createAccountForm, password: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role *</label>
                  <select
                    value={createAccountForm.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as Role;
                      setCreateAccountForm({
                        ...createAccountForm,
                        role: nextRole,
                        shipping_mark:
                          !createAccountForm.shipping_mark ||
                          createAccountForm.shipping_mark === "SUPER ADMIN" ||
                          createAccountForm.shipping_mark === "ADMIN"
                            ? nextRole === "super_admin"
                              ? "SUPER ADMIN"
                              : nextRole === "admin"
                              ? "ADMIN"
                              : ""
                            : createAccountForm.shipping_mark,
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm bg-white"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Base Admin</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status *</label>
                  <select
                    value={createAccountForm.account_status}
                    onChange={(e) =>
                      setCreateAccountForm({
                        ...createAccountForm,
                        account_status: e.target.value as AccountStatus,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm bg-white"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Approval</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shipping Mark / Display Label
                  </label>
                  <input
                    type="text"
                    placeholder="SUPER ADMIN"
                    value={createAccountForm.shipping_mark}
                    onChange={(e) =>
                      setCreateAccountForm({ ...createAccountForm, shipping_mark: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp / Phone (optional)
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g. 08031234567"
                    value={createAccountForm.phone_number}
                    onChange={(e) =>
                      setCreateAccountForm({ ...createAccountForm, phone_number: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateAccountModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 sm:border-transparent bg-white sm:bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingAccount}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {creatingAccount ? "Creating Account..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT ACCOUNT MODAL (Super Admin) */}
      {editingAccount && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <form
            onSubmit={handleSaveAccountModal}
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Account</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {editingAccount.email || editingAccount.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Mark *</label>
                <input
                  type="text"
                  required
                  value={editAccountForm.shipping_mark}
                  onChange={(e) =>
                    setEditAccountForm({ ...editAccountForm, shipping_mark: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Phone Number</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={editAccountForm.phone_number}
                  onChange={(e) =>
                    setEditAccountForm({ ...editAccountForm, phone_number: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
                  <select
                    value={editAccountForm.role}
                    disabled={editingAccount.id === user?.uid}
                    onChange={(e) =>
                      setEditAccountForm({ ...editAccountForm, role: e.target.value as Role })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm bg-white disabled:opacity-50"
                  >
                    <option value="client">Client</option>
                    <option value="admin">Base Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editAccountForm.account_status}
                    disabled={editingAccount.id === user?.uid}
                    onChange={(e) =>
                      setEditAccountForm({
                        ...editAccountForm,
                        account_status: e.target.value as AccountStatus,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm bg-white disabled:opacity-50"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Approval</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 sm:border-transparent bg-white sm:bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingAccountId === editingAccount.id}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD NEW SHIPMENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <form
            onSubmit={handleCreateShipment}
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New Shipment</h3>
                <p className="text-xs text-slate-500">Create a single shipment with customer WhatsApp contact</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Container Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., CON-NGA-091"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500"
                    value={newShipmentForm.container_id}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, container_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Mark *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., BIGFISH"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500"
                    value={newShipmentForm.shipping_mark}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, shipping_mark: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer WhatsApp Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g., 08031234567 or 2348031234567"
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 font-mono"
                    value={newShipmentForm.phone_number}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, phone_number: e.target.value })}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Local Nigerian numbers (080...) are automatically formatted to +234 for WhatsApp.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (CTN) *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={newShipmentForm.ctn}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, ctn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Volume (CBM) *</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={newShipmentForm.cbm}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, cbm: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Freight Rate (USD/CBM)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={`Default: ${settings?.seaFreightRateUsd || 180}`}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={newShipmentForm.freight_usd_per_cbm}
                    onChange={(e) =>
                      setNewShipmentForm({ ...newShipmentForm, freight_usd_per_cbm: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clearing Rate (NGN/CBM)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={`Default: ${settings?.seaClearingRateNgn || 300000}`}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={newShipmentForm.clearing_naira_per_cbm}
                    onChange={(e) =>
                      setNewShipmentForm({ ...newShipmentForm, clearing_naira_per_cbm: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={newShipmentForm.status}
                  onChange={(e) =>
                    setNewShipmentForm({ ...newShipmentForm, status: e.target.value as ShipmentStatus })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 uppercase bg-white"
                >
                  {allStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                {newShipmentForm.status === "shipped" && newShipmentForm.phone_number && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    Creating with status &ldquo;SHIPPED&rdquo; will automatically send the Packing List WhatsApp notification.
                  </p>
                )}
              </div>
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors rounded-lg border border-slate-200 sm:border-transparent bg-white sm:bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingShipment}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {creatingShipment ? "Saving..." : "Create Shipment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PACKING LIST MODAL */}
      {manifestModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Generate Packing List</h3>
                <p className="text-xs text-slate-500">Container: {manifestModal.containerId}</p>
              </div>
              <button
                type="button"
                onClick={() => setManifestModal({ isOpen: false, containerId: "", shipments: [] })}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loaded Date</label>
                <input
                  type="text"
                  placeholder="e.g., 10 Aug 2026"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500"
                  value={manifestOptions.loadedDate}
                  onChange={(e) => setManifestOptions({ ...manifestOptions, loadedDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Date</label>
                <input
                  type="text"
                  placeholder="e.g., 12 Aug 2026"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500"
                  value={manifestOptions.departureDate}
                  onChange={(e) => setManifestOptions({ ...manifestOptions, departureDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exchange Rate (USD/NGN)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 1500"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                  value={manifestOptions.exchangeRate}
                  onChange={(e) => setManifestOptions({ ...manifestOptions, exchangeRate: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Freight Rate (USD/CBM)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g., 180"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={manifestOptions.freightRate}
                    onChange={(e) => setManifestOptions({ ...manifestOptions, freightRate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clearing Rate (NGN/CBM)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g., 300000"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] text-base sm:text-sm focus:outline-blue-500 tabular-nums"
                    value={manifestOptions.clearingRate}
                    onChange={(e) => setManifestOptions({ ...manifestOptions, clearingRate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                onClick={() => setManifestModal({ isOpen: false, containerId: "", shipments: [] })}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors rounded-lg border border-slate-200 sm:border-transparent bg-white sm:bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  generateClientManifestPDF("VARIOUS", "", manifestModal.shipments, settings, manifestOptions);
                  setManifestModal({ isOpen: false, containerId: "", shipments: [] });
                  toast.success("Packing List Downloaded");
                }}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
