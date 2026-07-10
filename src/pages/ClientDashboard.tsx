import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { LogOut, Package, ArrowRight, ExternalLink, Download, FileText } from "lucide-react";
import { Shipment } from "../types";
import { getMockShipments } from "../lib/mockDb";
import { generateClientManifestPDF, generateConsignmentReceiptPDF } from "../utils/pdfGenerator";
import { toast } from "sonner";

export default function ClientDashboard() {
  const { dbUser, isMock, setMockMode } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyShipments = async () => {
      if (!dbUser?.phone_number) return;
      try {
        if (isMock) {
          const allMocks = getMockShipments();
          const data = allMocks.filter(s => s.phone_number === dbUser.phone_number);
          data.sort((a, b) => b.created_at - a.created_at);
          setShipments(data);
        } else {
          const q = query(
            collection(db, "shipments"),
            where("phone_number", "==", dbUser.phone_number)
          );
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shipment));
          
          // Sort in memory since Firestore requires composite index for where + orderby
          data.sort((a, b) => b.created_at - a.created_at);
          setShipments(data);
        }
      } catch (error) {
        console.error("Error fetching shipments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyShipments();
  }, [dbUser, isMock]);

  const getStatusColor = (status: string) => {
    if (status.includes("delivered")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (status.includes("cleared") || status.includes("ready")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (status.includes("transit")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (status.includes("received_china")) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-slate-700 text-slate-400 border-transparent";
  };

  return (
    <div className="h-full bg-[#0f172a] text-slate-300 flex flex-col font-sans overflow-hidden">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0f172a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
            <Package className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-white">Deep Down Logistics</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-white">{dbUser?.shipping_mark}</div>
            <div className="text-[10px] text-slate-500">{dbUser?.phone_number}</div>
          </div>
          <button 
            onClick={() => isMock ? setMockMode(null) : auth.signOut()}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-auto max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-sm font-medium text-white">My Shipments</h1>
            <p className="text-[10px] text-slate-400 mt-1">Track and manage your incoming cargo.</p>
          </div>
          {shipments.length > 0 && (
            <button
              onClick={() => generateClientManifestPDF(dbUser?.shipping_mark || "UNMARKED", dbUser?.phone_number || "", shipments)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              Download All (PDF Manifest)
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        ) : shipments.length === 0 ? (
          <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-12 text-center">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-slate-200">No shipments found</h3>
            <p className="mt-2 text-[10px] text-slate-500 max-w-sm mx-auto">We couldn't find any active shipments linked to your phone number ({dbUser?.phone_number}).</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shipments.map(shipment => (
              <div key={shipment.id} className="bg-[#1e293b] rounded-xl border border-slate-800 flex flex-col group hover:bg-slate-800/50 transition-colors">
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] whitespace-nowrap ${getStatusColor(shipment.status)}`}>
                      {shipment.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {format(shipment.created_at, "MMM d")}
                    </span>
                  </div>
                  <h3 className="font-mono text-xs text-slate-200 mb-1">{shipment.tracking_id}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{shipment.cbm} CBM</span>
                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                    <span>{shipment.ctn} CTN</span>
                  </div>
                </div>
                <div className="border-t border-slate-800 bg-slate-900/30 p-3 flex justify-between items-center rounded-b-xl group-hover:bg-slate-900/50 transition-colors">
                  <Link 
                    to={`/track/${shipment.tracking_id}`}
                    className="text-[10px] font-medium text-blue-400 flex items-center gap-1 hover:text-blue-300"
                  >
                    View Details <ArrowRight className="w-3 h-3" />
                  </Link>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => generateConsignmentReceiptPDF(shipment)}
                      className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1"
                      title="Download PDF Receipt / Note"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="text-[10px]">Receipt PDF</span>
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/track/${shipment.tracking_id}`);
                        toast.success("Tracking link copied to clipboard!");
                      }}
                      className="text-slate-500 hover:text-blue-400 transition-colors"
                      title="Copy Public Tracking Link"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
