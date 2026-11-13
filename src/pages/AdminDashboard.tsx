import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, getDoc, doc, writeBatch, setDoc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { format } from "date-fns";
import { LogOut, Upload, Package, ArrowRight, Search, Activity, FileSpreadsheet, Download, CheckCircle, Settings, Pencil, Check, X, Plus, Phone } from "lucide-react";
import { PricingSettings, Shipment, ShipmentStatus } from "../types";
import { getMockShipments, updateMockShipmentStatus, importMockManifest, updateMockShipmentPhone, createMockShipment } from "../lib/mockDb";
import { generateAdminManifestPDF, generateClientManifestPDF } from "../utils/pdfGenerator";
import { generatePackingListImage } from "../utils/packingListImageGenerator";
import { parseManifestRows, readManifestFile } from "../utils/manifestParser";

// Raw base64 of a Blob, without the "data:image/png;base64," prefix.
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Draws the shipment's packing list and sends it as the WhatsApp template's header image.
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

export default function AdminDashboard() {
  const { dbUser, isMock, setMockMode } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  
  // Inline phone editing state
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

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

  // Settings state
  const [settings, setSettings] = useState<any>({ exchangeRateUsdNgn: 1500, seaFreightRateUsd: 180, seaClearingRateNgn: 300000, airFreightRateUsd: 8, airClearingRateNgn: 15000 });
  const [testWhatsAppPhone, setTestWhatsAppPhone] = useState("");
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"shipments" | "settings">("shipments");
  const [manifestModal, setManifestModal] = useState<{ isOpen: boolean, containerId: string, shipments: Shipment[] }>({ isOpen: false, containerId: "", shipments: [] });
  const [manifestOptions, setManifestOptions] = useState({ loadedDate: "", departureDate: "", exchangeRate: "", freightRate: "", clearingRate: "" });

  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (!isMock) {
          const docSnap = await getDoc(doc(db, "settings", "pricing"));
          if (docSnap.exists()) {
            setSettings(docSnap.data());
          }
        } else {
          const saved = localStorage.getItem("ddl_mock_settings");
          if (saved) setSettings(JSON.parse(saved));
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };
    fetchSettings();
  }, [isMock]);

  const testWhatsApp = async () => {
    if (!testWhatsAppPhone) return toast.error("Please enter a phone number");
    setTestingWhatsApp(true);
    try {
      const res = await sendPackingListWhatsApp({
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
      }, "shipped", settings);
      const data = await res.json();
      if (res.ok && data.sent) {
        toast.success("Test WhatsApp message sent!");
      } else {
        toast.error(data.error || "Failed to send message");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      if (!isMock) {
        await setDoc(doc(db, "settings", "pricing"), settings);
      } else {
        localStorage.setItem("ddl_mock_settings", JSON.stringify(settings));
      }
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchShipments = async () => {
    try {
      if (isMock) {
        const data = getMockShipments();
        setShipments(data);
      } else {
        const q = query(collection(db, "shipments"), orderBy("created_at", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shipment));
        setShipments(data);
      }
    } catch (error) {
      console.error("Error fetching shipments:", error);
      toast.error("Failed to load shipments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleSavePhone = async (shipmentId: string) => {
    setSavingPhone(true);
    const cleaned = editingPhoneValue.trim();
    try {
      if (isMock) {
        updateMockShipmentPhone(shipmentId, cleaned);
      } else {
        await updateDoc(doc(db, "shipments", shipmentId), {
          phone_number: cleaned,
          updated_at: Date.now(),
        });
      }
      toast.success(cleaned ? "Customer WhatsApp number updated" : "Phone number cleared");
      setEditingPhoneId(null);
      fetchShipments();
    } catch (error) {
      console.error("Failed to update phone number:", error);
      toast.error("Failed to update phone number");
    } finally {
      setSavingPhone(false);
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
      const ctn = parseInt(newShipmentForm.ctn, 10) || 1;
      const cbm = parseFloat(newShipmentForm.cbm) || 0.1;
      const freightUsd = newShipmentForm.freight_usd_per_cbm ? parseFloat(newShipmentForm.freight_usd_per_cbm) : undefined;
      const clearingNgn = newShipmentForm.clearing_naira_per_cbm ? parseFloat(newShipmentForm.clearing_naira_per_cbm) : undefined;

      let createdShipment: Shipment;

      if (isMock) {
        createdShipment = createMockShipment({
          container_id: newShipmentForm.container_id,
          shipping_mark: newShipmentForm.shipping_mark,
          phone_number: newShipmentForm.phone_number,
          ctn,
          cbm,
          freight_usd_per_cbm: freightUsd,
          clearing_naira_per_cbm: clearingNgn,
          status: newShipmentForm.status,
        });
      } else {
        const trackingId = `DDL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const shipmentRef = doc(collection(db, "shipments"));
        const now = Date.now();
        const shipmentData: Omit<Shipment, "id"> = {
          tracking_id: trackingId,
          container_id: newShipmentForm.container_id.trim(),
          shipping_mark: newShipmentForm.shipping_mark.trim(),
          phone_number: newShipmentForm.phone_number.trim(),
          ctn,
          cbm,
          ...(freightUsd ? { freight_usd_per_cbm: freightUsd } : {}),
          ...(clearingNgn ? { clearing_naira_per_cbm: clearingNgn } : {}),
          status: newShipmentForm.status,
          created_at: now,
          updated_at: now,
        };

        const batch = writeBatch(db);
        batch.set(shipmentRef, shipmentData);

        const updateRef = doc(collection(db, "tracking_updates"));
        batch.set(updateRef, {
          shipment_id: shipmentRef.id,
          status: newShipmentForm.status,
          note: `Shipment manually created for container ${shipmentData.container_id}`,
          created_at: now,
        });

        await batch.commit();
        createdShipment = { id: shipmentRef.id, ...shipmentData };
      }

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
      fetchShipments();

      if (createdShipment.status === "shipped" && createdShipment.phone_number) {
        notifyStatusByWhatsApp(createdShipment, "shipped");
      }
    } catch (error) {
      console.error("Failed to create shipment:", error);
      toast.error("Failed to create shipment");
    } finally {
      setCreatingShipment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { shipments: rows } = parseManifestRows(await readManifestFile(file));

      if (isMock) {
        importMockManifest(rows);
      } else {
        const batch = writeBatch(db);
        for (const row of rows) {
          const shipmentRef = doc(collection(db, "shipments"));
          batch.set(shipmentRef, {
            ...row,
            tracking_id: `DDL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
            status: "received_china",
            created_at: Date.now(),
            updated_at: Date.now(),
          });
          batch.set(doc(collection(db, "tracking_updates")), {
            shipment_id: shipmentRef.id,
            status: "received_china",
            note: `Manifest imported for container ${row.container_id}`,
            created_at: Date.now(),
          });
        }
        await batch.commit();
      }

      toast.success(`Imported ${rows.length} shipments for container ${rows[0].container_id}`);
      fetchShipments();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import manifest");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  // Fires the WhatsApp status notification via the backend route. This is
  // intentionally "fire and forget" from the caller's perspective — a
  // failure here (missing credentials, network issue, etc.) is logged but
  // never blocks or rolls back the Firestore status update.
  // Only "shipped" sends: the approved template's header is the shipment's packing list.
  const notifyStatusByWhatsApp = (shipment: Shipment, status: string) => {
    if (!shipment.phone_number) return;
    if (status !== "shipped") return;

    const sendNow = () => {
      sendPackingListWhatsApp(shipment, status, settings).catch((error) => {
        console.error("Failed to send WhatsApp status notification:", error);
      });
    };

    // Give the admin a 5-second window to catch an accidental status change
    // before the WhatsApp message actually goes out. Clicking "Undo" cancels
    // the send entirely; letting the toast expire sends it as normal.
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
    const shipment = shipments.find(s => s.id === shipmentId);

    if (isMock) {
      try {
        updateMockShipmentStatus(shipmentId, newStatus as any);
        toast.success("Status updated");
        fetchShipments();
        if (shipment) {
          notifyStatusByWhatsApp(shipment, newStatus);
        }
      } catch (error) {
        toast.error("Failed to update status");
      }
      return;
    }

    try {
      const batch = writeBatch(db);
      
      const shipmentRef = doc(db, "shipments", shipmentId);
      batch.update(shipmentRef, { 
        status: newStatus,
        updated_at: Date.now()
      });

      const updateRef = doc(collection(db, "tracking_updates"));
      batch.set(updateRef, {
        shipment_id: shipmentId,
        status: newStatus,
        note: `Status updated by Admin`,
        created_at: Date.now()
      });

      await batch.commit();
      toast.success("Status updated");
      fetchShipments();

      if (shipment) {
        notifyStatusByWhatsApp(shipment, newStatus);
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const updateContainerStatus = async (containerId: string, newStatus: string) => {
    const shipmentsInContainer = shipments.filter(s => s.container_id === containerId);
    if (shipmentsInContainer.length === 0) return;

    if (isMock) {
      try {
        shipmentsInContainer.forEach(s => updateMockShipmentStatus(s.id, newStatus as any));
        toast.success(`Updated ${shipmentsInContainer.length} shipments`);
        fetchShipments();
        shipmentsInContainer.forEach(s => notifyStatusByWhatsApp(s, newStatus));
      } catch (error) {
        toast.error("Failed to update container status");
      }
      return;
    }

    try {
      const batch = writeBatch(db);
      
      shipmentsInContainer.forEach(shipment => {
        const shipmentRef = doc(db, "shipments", shipment.id);
        batch.update(shipmentRef, { 
          status: newStatus,
          updated_at: Date.now()
        });

        const updateRef = doc(collection(db, "tracking_updates"));
        batch.set(updateRef, {
          shipment_id: shipment.id,
          status: newStatus,
          note: `Container status updated by Admin`,
          created_at: Date.now()
        });
      });

      await batch.commit();
      toast.success(`Updated ${shipmentsInContainer.length} shipments`);
      fetchShipments();

      shipmentsInContainer.forEach(shipment => {
        notifyStatusByWhatsApp(shipment, newStatus);
      });
    } catch (error) {
      toast.error("Failed to update container status");
    }
  };

  const filteredShipments = shipments.filter(s => 
    s.tracking_id.toLowerCase().includes(search.toLowerCase()) ||
    s.shipping_mark.toLowerCase().includes(search.toLowerCase()) ||
    s.phone_number.includes(search)
  );

  const getStatusColor = (status: string) => {
    if (status.includes("delivered")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (status.includes("cleared") || status.includes("ready")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (status.includes("transit")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (status.includes("received_china")) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-slate-200 text-slate-700 border-transparent";
  };

  const allStatuses: ShipmentStatus[] = [
    'received_china', 'shipped', 'in_transit_sea', 'in_transit_air',
    'arrived_lagos', 'customs_clearing', 'cleared', 'ready_for_pickup',
    'out_for_delivery', 'delivered'
  ];

  return (
    <div className="h-full bg-slate-50 text-slate-700 flex flex-col font-sans overflow-hidden">
      <Helmet>
        <title>Admin Dashboard - Deep Down Logistics</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50 shrink-0">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/15">
            <Package className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-slate-900">Deep Down Logistics</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-slate-600 hidden sm:block">Admin: {dbUser?.shipping_mark}</span>
          <button 
            onClick={() => isMock ? setMockMode(null) : auth.signOut()}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      
      <div className="border-b border-slate-200 bg-white px-6 flex items-center gap-6 shrink-0">
        <button
          onClick={() => setActiveTab("shipments")}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "shipments" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Shipments
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === "settings" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
      
      <main className="flex-1 flex flex-col overflow-hidden max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "settings" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl">
            <div className="mb-8 border-b border-slate-100 pb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">WhatsApp Integration</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="Phone Number (e.g. 2348012345678)" 
                  value={testWhatsAppPhone}
                  onChange={e => setTestWhatsAppPhone(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-emerald-500 flex-1 max-w-xs"
                />
                <button 
                  onClick={testWhatsApp} 
                  disabled={testingWhatsApp || !testWhatsAppPhone} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {testingWhatsApp ? "Sending..." : "Send Test Message"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This will send a mock "Shipped" status update using the template configured in WHATSAPP_TEMPLATE_NAME.
              </p>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Pricing & Calculator Settings</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Exchange Rate (USD to NGN)</label>
                  <input type="number" value={settings.exchangeRateUsdNgn} onChange={e => setSettings({...settings, exchangeRateUsdNgn: Number(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-medium text-slate-800 mb-3">Sea Freight</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Freight Rate per CBM (USD)</label>
                    <input type="number" value={settings.seaFreightRateUsd} onChange={e => setSettings({...settings, seaFreightRateUsd: Number(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Clearing Rate per CBM (NGN)</label>
                    <input type="number" value={settings.seaClearingRateNgn} onChange={e => setSettings({...settings, seaClearingRateNgn: Number(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-medium text-slate-800 mb-3">Air Freight</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Freight Rate per Kg (USD)</label>
                    <input type="number" value={settings.airFreightRateUsd} onChange={e => setSettings({...settings, airFreightRateUsd: Number(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Clearing Rate per Kg (NGN)</label>
                    <input type="number" value={settings.airClearingRateNgn} onChange={e => setSettings({...settings, airClearingRateNgn: Number(e.target.value)})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button onClick={saveSettings} disabled={savingSettings} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "shipments" && (
<>
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
          <div>
            <h1 className="text-sm font-medium text-slate-900">Overview</h1>
            <div className="text-[10px] text-slate-600 mt-1">Manage tracking, container manifests, and delivery statuses.</div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 min-w-[140px] md:w-64">
              <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="Search by Mark, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-slate-600 shadow-sm"
              />
            </div>
            <button
              onClick={() => {
                if (filteredShipments.length === 0) {
                  toast.error("No shipments to download");
                  return;
                }
                generateAdminManifestPDF(filteredShipments);
                toast.success("Downloading consolidated manifest PDF...");
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-800 hover:text-slate-900 text-xs font-medium rounded-md border border-slate-300 transition-colors whitespace-nowrap shadow-sm"
            >
              <Download className="w-3 h-3 text-blue-400" />
              Download PDF
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition-colors whitespace-nowrap shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Shipment
            </button>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors whitespace-nowrap shadow-sm">
              {uploading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : (
                <FileSpreadsheet className="w-3 h-3" />
              )}
              Import Manifest
              <input type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3">ID / Mark</th>
                  <th className="px-4 py-3">Client Contact (WhatsApp)</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3">Status</th>
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
                  Object.entries(
                    filteredShipments.reduce((acc, shipment) => {
                      const key = shipment.container_id || "Unassigned";
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(shipment);
                      return acc;
                    }, {} as Record<string, Shipment[]>)
                  ).map(([containerId, containerShipments]) => (
                    <React.Fragment key={containerId}>
                      <tr className="bg-slate-50/90 border-y border-slate-200">
                        <td colSpan={4} className="px-4 py-2 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                            <span>Container: <span className="font-mono">{containerId}</span></span>
                            <span className="text-[10px] text-slate-600 ml-2">({(containerShipments as Shipment[]).length} items)</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <select 
                            onChange={(e) => updateContainerStatus(containerId, e.target.value)}
                            className="text-[10px] uppercase font-medium bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Update All To...</option>
                            {allStatuses.map(status => (
                              <option key={status} value={status}>
                                {status.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              setManifestModal({ isOpen: true, containerId, shipments: containerShipments as Shipment[] });
                              setManifestOptions({ loadedDate: "", departureDate: "", exchangeRate: settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toString() : "", freightRate: settings?.seaFreightRateUsd ? settings.seaFreightRateUsd.toString() : "", clearingRate: settings?.seaClearingRateNgn ? settings.seaClearingRateNgn.toString() : "" });
                            }}
                            className="ml-2 inline-flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 text-[10px] font-medium rounded border border-slate-300 transition-colors shadow-sm"
                          >
                            <Download className="w-3 h-3 text-blue-400" />
                            Packing List
                          </button>

                        </td>
                      </tr>
                      {(containerShipments as Shipment[]).map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <div className="font-mono text-slate-600">{shipment.tracking_id}</div>
                            <div className="font-medium text-slate-800 mt-0.5">{shipment.shipping_mark}</div>
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
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                                  title="Save Phone Number"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingPhoneId(null)}
                                  disabled={savingPhone}
                                  className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <span className={shipment.phone_number ? "text-slate-800 font-mono" : "text-amber-600 italic"}>
                                  {shipment.phone_number || "No WhatsApp #"}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingPhoneId(shipment.id);
                                    setEditingPhoneValue(shipment.phone_number || "");
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                  title="Edit customer WhatsApp number"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                  {shipment.phone_number ? "Edit" : "Add #"}
                                </button>
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 mt-0.5">{shipment.container_id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-700">{shipment.cbm} CBM</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{shipment.ctn} CTN</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] whitespace-nowrap ${getStatusColor(shipment.status)}`}>
                              {shipment.status.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {shipment.status !== 'delivered' && (
                                <button
                                  onClick={() => updateStatus(shipment.id, 'delivered')}
                                  className="text-emerald-500 hover:text-emerald-400 p-1 rounded hover:bg-emerald-500/10 transition-colors"
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
                                {allStatuses.map(status => (
                                  <option key={status} value={status}>
                                    {status.replace(/_/g, " ")}
                                  </option>
                                ))}
                              </select>
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
      </>)}
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <form onSubmit={handleCreateShipment} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New Shipment</h3>
                <p className="text-xs text-slate-500">Create a single shipment with customer WhatsApp contact</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Container Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., CON-NGA-091"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
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
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
                    value={newShipmentForm.shipping_mark}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, shipping_mark: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer WhatsApp Number</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g., 08031234567 or 2348031234567"
                    className="w-full border border-slate-300 rounded pl-8 pr-3 py-2 text-sm focus:outline-blue-500 font-mono"
                    value={newShipmentForm.phone_number}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, phone_number: e.target.value })}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Local Nigerian numbers (080...) are automatically formatted to +234 for WhatsApp.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (CTN) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
                    value={newShipmentForm.ctn}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, ctn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Volume (CBM) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
                    value={newShipmentForm.cbm}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, cbm: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Freight Rate (USD/CBM)</label>
                  <input
                    type="number"
                    placeholder={`Default: ${settings?.seaFreightRateUsd || 180}`}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
                    value={newShipmentForm.freight_usd_per_cbm}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, freight_usd_per_cbm: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clearing Rate (NGN/CBM)</label>
                  <input
                    type="number"
                    placeholder={`Default: ${settings?.seaClearingRateNgn || 300000}`}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500"
                    value={newShipmentForm.clearing_naira_per_cbm}
                    onChange={(e) => setNewShipmentForm({ ...newShipmentForm, clearing_naira_per_cbm: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={newShipmentForm.status}
                  onChange={(e) => setNewShipmentForm({ ...newShipmentForm, status: e.target.value as ShipmentStatus })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500 uppercase bg-white"
                >
                  {allStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                {newShipmentForm.status === "shipped" && newShipmentForm.phone_number && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    Creating with status "SHIPPED" will automatically send the Packing List WhatsApp notification.
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingShipment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {creatingShipment ? "Saving..." : "Create Shipment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {manifestModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Generate Packing List</h3>
              <p className="text-xs text-slate-500">Container: {manifestModal.containerId}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loaded Date</label>
                <input type="text" placeholder="e.g., 10 Aug 2026" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" value={manifestOptions.loadedDate} onChange={e => setManifestOptions({...manifestOptions, loadedDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Date</label>
                <input type="text" placeholder="e.g., 12 Aug 2026" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" value={manifestOptions.departureDate} onChange={e => setManifestOptions({...manifestOptions, departureDate: e.target.value})} />
              </div>
                            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exchange Rate (USD/NGN)</label>
                <input type="text" placeholder="e.g., 1500" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" value={manifestOptions.exchangeRate} onChange={e => setManifestOptions({...manifestOptions, exchangeRate: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Freight Rate (USD/CBM)</label>
                  <input type="text" placeholder="e.g., 180" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" value={manifestOptions.freightRate} onChange={e => setManifestOptions({...manifestOptions, freightRate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clearing Rate (NGN/CBM)</label>
                  <input type="text" placeholder="e.g., 300000" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" value={manifestOptions.clearingRate} onChange={e => setManifestOptions({...manifestOptions, clearingRate: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setManifestModal({ isOpen: false, containerId: "", shipments: [] })} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={() => {
                 generateClientManifestPDF("VARIOUS", "", manifestModal.shipments, settings, manifestOptions);
                 setManifestModal({ isOpen: false, containerId: "", shipments: [] });
                 toast.success("Packing List Downloaded");
              }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

