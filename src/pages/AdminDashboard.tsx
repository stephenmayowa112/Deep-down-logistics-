import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, doc, writeBatch, setDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import Papa from "papaparse";
import { toast } from "sonner";
import { format } from "date-fns";
import { LogOut, Upload, Package, ArrowRight, Search, Activity, FileSpreadsheet, Download } from "lucide-react";
import { Shipment, ShipmentStatus } from "../types";
import { getMockShipments, updateMockShipmentStatus, importMockManifest } from "../lib/mockDb";
import { generateAdminManifestPDF } from "../utils/pdfGenerator";

export default function AdminDashboard() {
  const { dbUser, isMock, setMockMode } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

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

  const updateStatus = async (shipmentId: string, newStatus: string) => {
    if (isMock) {
      try {
        updateMockShipmentStatus(shipmentId, newStatus as any);
        toast.success("Status updated");
        fetchShipments();
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
    } catch (error) {
      toast.error("Failed to update status");
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
    return "bg-slate-700 text-slate-400 border-transparent";
  };

  const allStatuses: ShipmentStatus[] = [
    'received_china', 'shipped', 'in_transit_sea', 'in_transit_air',
    'arrived_lagos', 'customs_clearing', 'cleared', 'ready_for_pickup',
    'out_for_delivery', 'delivered'
  ];

  return (
    <div className="h-full bg-[#0f172a] text-slate-300 flex flex-col font-sans overflow-hidden">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0f172a] shrink-0">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/15">
            <Package className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-white">Deep Down Logistics</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-slate-400 hidden sm:block">Admin: {dbUser?.shipping_mark}</span>
          <button 
            onClick={() => isMock ? setMockMode(null) : auth.signOut()}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
          <div>
            <h1 className="text-sm font-medium text-white">Overview</h1>
            <div className="text-[10px] text-slate-400 mt-1">Manage tracking, container manifests, and delivery statuses.</div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 min-w-[140px] md:w-64">
              <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="Search by Mark, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#1e293b] border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none focus:border-slate-600 shadow-sm"
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
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium rounded-md border border-slate-700 transition-colors whitespace-nowrap shadow-sm"
            >
              <Download className="w-3 h-3 text-blue-400" />
              Download PDF
            </button>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors whitespace-nowrap">
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

        <div className="bg-[#1e293b] rounded-xl border border-slate-800 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                <tr className="border-b border-slate-800">
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
                  filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-400">{shipment.tracking_id}</div>
                        <div className="font-medium text-slate-200 mt-0.5">{shipment.shipping_mark}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-300">{shipment.phone_number || "Unmatched"}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{shipment.container_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-300">{shipment.cbm} CBM</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{shipment.ctn} CTN</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] whitespace-nowrap ${getStatusColor(shipment.status)}`}>
                          {shipment.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select 
                          value={shipment.status}
                          onChange={(e) => updateStatus(shipment.id, e.target.value)}
                          className="text-[10px] uppercase font-medium bg-[#0f172a] border border-slate-700 rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {allStatuses.map(status => (
                            <option key={status} value={status}>
                              {status.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
