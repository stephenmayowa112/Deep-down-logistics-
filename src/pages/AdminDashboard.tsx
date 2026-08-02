import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, getDoc, doc, writeBatch, setDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import Papa from "papaparse";
import { toast } from "sonner";
import { format } from "date-fns";
import { LogOut, Upload, Package, ArrowRight, Search, Activity, FileSpreadsheet, Download, CheckCircle, Settings } from "lucide-react";
import { Shipment, ShipmentStatus } from "../types";
import { getMockShipments, updateMockShipmentStatus, importMockManifest } from "../lib/mockDb";
import { generateAdminManifestPDF, generateClientManifestPDF } from "../utils/pdfGenerator";

export default function AdminDashboard() {
  const { dbUser, isMock, setMockMode } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  
  // Settings state
  const [settings, setSettings] = useState<any>({ exchangeRateUsdNgn: 1500, seaFreightRateUsd: 180, seaClearingRateNgn: 300000, airFreightRateUsd: 8, airClearingRateNgn: 15000 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"shipments" | "settings">("shipments");
  const [manifestModal, setManifestModal] = useState<{ isOpen: boolean, containerId: string, shipments: Shipment[] }>({ isOpen: false, containerId: "", shipments: [] });
  const [manifestOptions, setManifestOptions] = useState({ loadedDate: "", departureDate: "", exchangeRate: "" });

  
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    if (isMock) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const count = importMockManifest(results.data);
            toast.success(`Successfully imported ${count} shipments`);
            fetchShipments();
          } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to import manifest");
          } finally {
            setUploading(false);
            if (e.target) e.target.value = '';
          }
        },
        error: (error) => {
          toast.error("Error parsing CSV");
          setUploading(false);
        }
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          let count = 0;
          
          for (const row of results.data as any[]) {
            const containerId = row.container_number;
            // Generate a tracking ID
            const trackingId = `DDL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
            const shipmentRef = doc(collection(db, "shipments"));
            
            const shipmentData = {
              tracking_id: trackingId,
              container_id: containerId,
              shipping_mark: row.shipping_mark,
              phone_number: row.phone_number || "",
              ctn: parseInt(row.ctn) || 0,
              cbm: parseFloat(row.cbm) || 0,
              status: "received_china",
              created_at: Date.now(),
              updated_at: Date.now(),
            };

            batch.set(shipmentRef, shipmentData);
            
            // Also add initial tracking update
            const updateRef = doc(collection(db, "tracking_updates"));
            batch.set(updateRef, {
              shipment_id: shipmentRef.id,
              status: "received_china",
              note: `Manifest imported for container ${containerId}`,
              created_at: Date.now()
            });

            count++;
          }

          await batch.commit();
          toast.success(`Successfully imported ${count} shipments`);
          fetchShipments();
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Failed to import manifest");
        } finally {
          setUploading(false);
          if (e.target) e.target.value = '';
        }
      },
      error: (error) => {
        toast.error("Error parsing CSV");
        setUploading(false);
      }
    });
  };

  // Fires the WhatsApp status notification via the backend route. This is
  // intentionally "fire and forget" from the caller's perspective — a
  // failure here (missing credentials, network issue, etc.) is logged but
  // never blocks or rolls back the Firestore status update.
  const notifyStatusByWhatsApp = (shipment: Shipment, status: string) => {
    if (!shipment.phone_number) return;

    const sendNow = () => {
      fetch("/api/notify-status", {
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
        }),
      }).catch((error) => {
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
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-slate-900 text-xs font-medium rounded-md transition-colors whitespace-nowrap">
              {uploading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : (
                <FileSpreadsheet className="w-3 h-3" />
              )}
              Import Manifest
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3">ID / Mark</th>
                  <th className="px-4 py-3">Client Contact</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-800">
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
                      <tr className="bg-white/80 border-y border-slate-300/50">
                        <td colSpan={4} className="px-4 py-2 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-blue-400" />
                            <span>Container: <span className="font-mono">{containerId}</span></span>
                            <span className="text-[10px] text-slate-600 ml-2">({(containerShipments as Shipment[]).length} items)</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <select 
                            onChange={(e) => updateContainerStatus(containerId, e.target.value)}
                            className="text-[10px] uppercase font-medium bg-white border border-slate-600 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
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
                              setManifestOptions({ loadedDate: "", departureDate: "", exchangeRate: settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toString() : "" });
                            }}
                            className="ml-2 inline-flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 text-[10px] font-medium rounded border border-slate-300 transition-colors shadow-sm"
                          >
                            <Download className="w-3 h-3 text-blue-400" />
                            Packing List
                          </button>

                        </td>
                      </tr>
                      {(containerShipments as Shipment[]).map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-white/50">
                          <td className="px-4 py-3">
                            <div className="font-mono text-slate-600">{shipment.tracking_id}</div>
                            <div className="font-medium text-slate-800 mt-0.5">{shipment.shipping_mark}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-700">{shipment.phone_number || "Unmatched"}</div>
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
