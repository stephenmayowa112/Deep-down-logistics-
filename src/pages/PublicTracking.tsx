import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { Package, Search, Navigation, AlertCircle, ArrowLeft, MapPin, Box, Eye, Calendar, UserCheck } from "lucide-react";
import { Shipment, TrackingUpdate } from "../types";
import { getMockShipments, getMockUpdates } from "../lib/mockDb";

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
        // Fallback to local storage mock database for quick-testing/bypasses
        const mocks = getMockShipments();
        const found = mocks.find(s => s.tracking_id.toUpperCase() === trackingId?.toUpperCase());
        if (found) {
          const allUpdates = getMockUpdates();
          const updates = allUpdates.filter(u => u.shipment_id === found.id);
          setShipment({
            ...found,
            updates
          });
          setError("");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    if (trackingId) fetchTracking();
  }, [trackingId]);

  const getStatusColor = (status: string) => {
    if (status.includes("delivered")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status.includes("cleared") || status.includes("ready")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status.includes("transit")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (status.includes("received_china")) return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    return "bg-slate-700/50 text-slate-400 border-white/5";
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-300 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* GLOBAL ROUTES NETWORK BACKGROUND OVERLAY */}
      <div 
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.03] mix-blend-overlay pointer-events-none z-0" 
      />

      {/* BACKGROUND LIQUID GLASS AMBIENT BLOBS */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none liquid-blob-1" />
      <div className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none liquid-blob-2" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070b14]/75 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 clay-card-blue flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-base tracking-tight text-white block">
                Deep Down Logistics
              </span>
              <span className="text-[9px] text-blue-400 font-medium tracking-widest uppercase block -mt-1">
                Guangzhou • Lagos
              </span>
            </div>
          </div>
          <Link to="/" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Console */}
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full relative z-10">
        
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Home
          </Link>
          <span className="text-[10px] bg-white/5 px-2.5 py-1 rounded-md border border-white/5 text-slate-500 font-mono">
            REF: Tracking Module
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error || !shipment ? (
          <div className="glass-panel rounded-3xl p-10 text-center border border-white/5">
            <AlertCircle className="w-10 h-10 text-red-500/70 mx-auto mb-4" />
            <h3 className="text-base font-display font-bold text-slate-200">Shipment Not Located</h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              We couldn't locate a cargo manifest assigned to "{trackingId?.toUpperCase()}". Please verify the tracking ID with your shipping supervisor.
            </p>
            <div className="mt-6">
              <Link to="/" className="clay-btn-slate inline-flex py-2 px-5 rounded-xl text-xs font-bold uppercase tracking-wide">
                Try Another Search
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Mode illustration banner */}
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 group h-40">
              <img 
                src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80" 
                alt="Consignment transit mode" 
                className="w-full h-full object-cover opacity-60 group-hover:scale-[1.02] transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/50 to-[#070b14]/20" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                  <span className="text-[9px] uppercase tracking-widest text-slate-300 font-bold font-mono">
                    Guangzhou Hub to Apapa Lagos corridor
                  </span>
                </div>
                <h3 className="text-lg font-display font-extrabold text-white mt-1">
                  Active Consignment Transit
                </h3>
              </div>
            </div>

            {/* Core shipment card - Beautiful Glassmorphic layout */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-white/5">
                <div>
                  <div className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest mb-1">Live Manifest State</div>
                  <h2 className="text-2xl font-mono font-bold text-white tracking-tight">{shipment.tracking_id}</h2>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Client Shipping Mark: <span className="font-bold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/5 ml-1">{shipment.shipping_mark}</span>
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(shipment.status)}`}>
                  {shipment.status.replace(/_/g, " ")}
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="bg-[#0d1323]/50 p-3.5 rounded-2xl border border-white/5 shadow-inner">
                  <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-wider flex items-center gap-1">
                    <Box className="w-3 h-3 text-blue-400" /> Package Count
                  </p>
                  <p className="text-sm font-bold text-slate-200 font-mono">{shipment.ctn} CTN</p>
                </div>
                
                <div className="bg-[#0d1323]/50 p-3.5 rounded-2xl border border-white/5 shadow-inner">
                  <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-wider flex items-center gap-1">
                    <Eye className="w-3 h-3 text-indigo-400" /> Cargo Volume
                  </p>
                  <p className="text-sm font-bold text-slate-200 font-mono">{shipment.cbm} CBM</p>
                </div>

                <div className="bg-[#0d1323]/50 p-3.5 rounded-2xl border border-white/5 shadow-inner">
                  <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" /> Intake Date
                  </p>
                  <p className="text-xs font-bold text-slate-200">{format(shipment.created_at, "MMM d, yyyy")}</p>
                </div>

                <div className="bg-[#0d1323]/50 p-3.5 rounded-2xl border border-white/5 shadow-inner">
                  <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-wider flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-400" /> Freight Mode
                  </p>
                  <p className="text-xs font-bold text-blue-400">Direct Consolidation</p>
                </div>
              </div>
            </div>

            {/* Tracking updates history */}
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <h3 className="text-xs font-display font-bold text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-400" />
                  Cargo Transit Log
                </h3>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Live Updates</span>
              </div>
              <div className="p-6 sm:p-8">
                {shipment.updates.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No transit scans logged yet.</p>
                ) : (
                  <div className="relative border-l-2 border-white/5 ml-3 space-y-8 py-1.5">
                    {shipment.updates.map((update, index) => (
                      <div key={update.id} className="relative pl-7 group">
                        
                        {/* Timeline node */}
                        <div className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 transition-transform duration-300 group-hover:scale-110 ${index === 0 ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-slate-800 border-white/10'}`} />
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 bg-[#0d1323]/30 p-4 rounded-2xl border border-white/[0.03] shadow-inner">
                          <div>
                            <p className={`text-xs font-display font-bold uppercase tracking-wider ${index === 0 ? 'text-white' : 'text-slate-400'}`}>
                              {update.status.replace(/_/g, " ")}
                            </p>
                            {update.note && (
                              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed bg-[#070b14]/50 p-2.5 rounded-lg border border-white/5">
                                {update.note}
                              </p>
                            )}
                          </div>
                          <time className="text-[10px] text-slate-500 shrink-0 font-semibold font-mono bg-white/5 px-2.5 py-1 rounded-md border border-white/5 self-start">
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

      {/* Footer */}
      <footer className="bg-[#05080f] border-t border-white/5 py-8 mt-auto shrink-0 text-center relative z-10">
        <p className="text-[10px] text-slate-500">© 2026 Deep Down Logistics Portal • Fast cargo clearance at Apapa Lagos</p>
      </footer>
    </div>
  );
}
