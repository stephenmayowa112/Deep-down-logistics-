import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { Package, Search, Navigation, AlertCircle, ArrowLeft, MapPin } from "lucide-react";
import { Shipment, TrackingUpdate } from "../types";

export default function PublicTracking() {
  const { trackingId } = useParams();
  const [shipment, setShipment] = useState<Shipment & { updates: TrackingUpdate[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const response = await fetch(`/api/track/${trackingId}`);
        if (!response.ok) {
          throw new Error("Shipment not found");
        }
        const data = await response.json();
        setShipment(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (trackingId) fetchTracking();
  }, [trackingId]);

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
        <Link to="/login" className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">
          Login
        </Link>
      </header>

      <main className="flex-1 flex flex-col overflow-auto max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="mb-6 shrink-0">
          <Link to="/" className="inline-flex items-center text-[10px] font-medium text-slate-500 hover:text-slate-300 mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back to Home
          </Link>
          <h1 className="text-sm font-medium text-white">Track Shipment</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        ) : error || !shipment ? (
          <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500/50 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-200">Shipment not found</h3>
            <p className="mt-1 text-[10px] text-slate-500">We couldn't find a shipment with the tracking ID "{trackingId}".</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-mono text-white">{shipment.tracking_id}</h2>
                  <p className="text-[10px] text-slate-500 mt-1">Mark: <span className="font-medium text-slate-300">{shipment.shipping_mark}</span></p>
                </div>
                <div className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${getStatusColor(shipment.status)}`}>
                  {shipment.status.replace(/_/g, " ").toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-slate-800">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Items</p>
                  <p className="text-xs font-semibold text-slate-200">{shipment.ctn} CTN</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Volume</p>
                  <p className="text-xs font-semibold text-slate-200">{shipment.cbm} CBM</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Added</p>
                  <p className="text-xs font-semibold text-slate-200">{format(shipment.created_at, "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Provider</p>
                  <p className="text-xs font-semibold text-blue-400">Deep Down Logistics</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-slate-500" />
                  Tracking History
                </h3>
              </div>
              <div className="p-5">
                {shipment.updates.length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-4">No tracking updates yet.</p>
                ) : (
                  <div className="relative border-l border-slate-700 ml-2 space-y-6 py-1">
                    {shipment.updates.map((update, index) => (
                      <div key={update.id} className="relative pl-6">
                        <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-blue-500 ring-2 ring-[#1e293b]' : 'bg-slate-600'}`}></div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                          <div>
                            <p className={`text-xs ${index === 0 ? 'text-white font-medium' : 'text-slate-400'}`}>
                              {update.status.replace(/_/g, " ").toUpperCase()}
                            </p>
                            {update.note && <p className="text-[10px] text-slate-500 mt-1">{update.note}</p>}
                          </div>
                          <time className="text-[10px] text-slate-500 shrink-0 whitespace-nowrap">
                            {format(update.created_at, "MMM d, yyyy • h:mm a")}
                          </time>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
