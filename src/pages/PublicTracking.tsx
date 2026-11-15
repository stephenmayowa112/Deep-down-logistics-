import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Package, Navigation, AlertCircle, ArrowLeft, Box, Eye, Calendar, UserCheck } from "lucide-react";
import { Shipment, TrackingUpdate } from "../types";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export default function PublicTracking() {
  const { trackingId } = useParams();
  const [shipment, setShipment] = useState<(Shipment & { updates: TrackingUpdate[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!trackingId) {
      setLoading(false);
      setError("No tracking ID provided");
      return;
    }

    setLoading(true);
    setError("");
    const normalizedId = trackingId.trim().toUpperCase();
    let unsubscribeUpdates: (() => void) | null = null;

    const shipmentsQ = query(
      collection(db, "shipments"),
      where("tracking_id", "==", normalizedId),
      limit(1)
    );

    const unsubscribeShipment = onSnapshot(
      shipmentsQ,
      (snapshot) => {
        if (unsubscribeUpdates) {
          unsubscribeUpdates();
          unsubscribeUpdates = null;
        }

        if (snapshot.empty) {
          setShipment(null);
          setError("Shipment not found");
          setLoading(false);
          return;
        }

        const shipmentDoc = snapshot.docs[0];
        const shipmentData = shipmentDoc.data() as Omit<Shipment, "id">;

        const updatesQ = query(
          collection(db, "tracking_updates"),
          where("shipment_id", "==", shipmentDoc.id)
        );

        unsubscribeUpdates = onSnapshot(
          updatesQ,
          (updatesSnapshot) => {
            const updates = updatesSnapshot.docs
              .map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
              })) as TrackingUpdate[];

            updates.sort((a, b) => b.created_at - a.created_at);

            setShipment({
              id: shipmentDoc.id,
              ...shipmentData,
              updates,
            });
            setError("");
            setLoading(false);
          },
          (err) => {
            setError("Failed to load tracking timeline");
            setLoading(false);
            handleFirestoreError(err, OperationType.GET, "tracking_updates");
          }
        );
      },
      (err) => {
        setError("Failed to locate shipment");
        setLoading(false);
        handleFirestoreError(err, OperationType.GET, "shipments");
      }
    );

    return () => {
      unsubscribeShipment();
      if (unsubscribeUpdates) unsubscribeUpdates();
    };
  }, [trackingId]);

  const getStatusColor = (status: string) => {
    if (status.includes("delivered")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status.includes("cleared") || status.includes("ready")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (status.includes("transit")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (status.includes("received_china")) return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    return "bg-slate-200 text-slate-600 border-slate-100";
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-700 flex flex-col font-sans relative overflow-x-clip">
      <Helmet>
        <title>{trackingId ? `Tracking ${trackingId.toUpperCase()} - Deep Down Logistics` : "Track Cargo - Deep Down Logistics"}</title>
        <meta name="description" content={`Track the live status of your cargo from Guangzhou to Lagos. Real-time updates for shipment ${trackingId || ""}.`} />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* GLOBAL ROUTES NETWORK BACKGROUND OVERLAY */}
      <div
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524522173746-f628baad3644?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.03] mix-blend-overlay pointer-events-none z-0"
      />

      {/* BACKGROUND LIQUID GLASS AMBIENT BLOBS */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none liquid-blob-1" />
      <div className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none liquid-blob-2" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-50/85 border-b border-slate-200/70 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity min-w-0">
            <div className="w-10 h-10 clay-card-blue flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-sm sm:text-base tracking-tight text-slate-900 block truncate">
                Deep Down Logistics
              </span>
              <span className="text-[10px] text-blue-500 font-medium tracking-widest uppercase block -mt-0.5">
                Guangzhou • Lagos
              </span>
            </div>
          </Link>
          <Link to="/" className="min-h-[44px] inline-flex items-center px-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors shrink-0">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Console */}
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full relative z-10">
        <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
          <Link to="/" className="min-h-[40px] inline-flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Home
          </Link>
          <span className="text-[11px] bg-white/70 px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 font-mono">
            REF: Tracking Module
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error || !shipment ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center border border-slate-200">
            <AlertCircle className="w-10 h-10 text-red-500/70 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-display font-bold text-slate-800">Shipment Not Located</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              We couldn't locate a cargo manifest assigned to "{trackingId?.toUpperCase()}". Please verify the tracking ID with your shipping supervisor.
            </p>
            <div className="mt-6">
              <Link to="/" className="clay-btn-slate inline-flex items-center justify-center min-h-[44px] py-2.5 px-6 rounded-xl text-xs font-bold uppercase tracking-wide">
                Try Another Search
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            <div className="glass-panel rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl relative border border-slate-200 group h-44 sm:h-48">
              <img
                src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80"
                alt="Consignment transit mode"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/15" />
              <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider text-blue-200 font-bold font-mono">
                    Guangzhou Hub to Apapa Lagos corridor
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-display font-extrabold text-white mt-1">
                  Active Consignment Transit
                </h3>
              </div>
            </div>

            <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-200/70">
                <div className="min-w-0">
                  <div className="text-[11px] text-blue-500 font-extrabold uppercase tracking-widest mb-1">Live Manifest State</div>
                  <h2 className="text-xl sm:text-2xl font-mono font-bold text-slate-900 tracking-tight break-all">{shipment.tracking_id}</h2>
                  <p className="text-xs text-slate-600 mt-1.5">
                    Client Shipping Mark: <span className="font-bold text-slate-800 bg-white/80 px-2.5 py-0.5 rounded-md border border-slate-200 ml-1 inline-block">{shipment.shipping_mark}</span>
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider shrink-0 ${getStatusColor(shipment.status)}`}>
                  {shipment.status.replace(/_/g, " ")}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                <div className="bg-white/70 p-3.5 rounded-2xl border border-slate-200/70 shadow-inner">
                  <p className="text-[11px] uppercase font-bold text-slate-500 mb-1 tracking-wider flex items-center gap-1">
                    <Box className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Packages
                  </p>
                  <p className="text-sm font-bold text-slate-800 font-mono tabular-nums">{shipment.ctn} CTN</p>
                </div>

                <div className="bg-white/70 p-3.5 rounded-2xl border border-slate-200/70 shadow-inner">
                  <p className="text-[11px] uppercase font-bold text-slate-500 mb-1 tracking-wider flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Volume
                  </p>
                  <p className="text-sm font-bold text-slate-800 font-mono tabular-nums">{shipment.cbm} CBM</p>
                </div>

                <div className="bg-white/70 p-3.5 rounded-2xl border border-slate-200/70 shadow-inner">
                  <p className="text-[11px] uppercase font-bold text-slate-500 mb-1 tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Intake Date
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{format(shipment.created_at, "MMM d, yyyy")}</p>
                </div>

                <div className="bg-white/70 p-3.5 rounded-2xl border border-slate-200/70 shadow-inner">
                  <p className="text-[11px] uppercase font-bold text-slate-500 mb-1 tracking-wider flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Mode
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-blue-600">Direct Consolidation</p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-200/70 bg-white/40 flex items-center justify-between">
                <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-500" />
                  Cargo Transit Log
                </h3>
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Live Updates</span>
              </div>
              <div className="p-4 sm:p-8">
                {shipment.updates.length === 0 ? (
                  <p className="text-xs sm:text-sm text-slate-500 text-center py-6">No transit scans logged yet.</p>
                ) : (
                  <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 sm:space-y-8 py-1.5">
                    {shipment.updates.map((update, index) => (
                      <div key={update.id} className="relative pl-6 sm:pl-7 group">
                        <div className={`absolute -left-[8px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-transform duration-300 group-hover:scale-110 ${index === 0 ? "bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/20" : "bg-white border-slate-300"}`} />

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 bg-white/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm">
                          <div>
                            <p className={`text-xs sm:text-sm font-display font-bold uppercase tracking-wider ${index === 0 ? "text-slate-900" : "text-slate-600"}`}>
                              {update.status.replace(/_/g, " ")}
                            </p>
                            {update.note && (
                              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                {update.note}
                              </p>
                            )}
                          </div>
                          <time className="text-[11px] text-slate-500 shrink-0 font-semibold font-mono bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/80 self-start">
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
      <footer className="bg-slate-900 text-slate-400 py-12 sm:py-16 relative z-10 shrink-0 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 pb-10 sm:pb-12 border-b border-slate-800 text-left">
            <div className="lg:col-span-1">
              <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity mb-4">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-white block">Deep Down Logistics</span>
                  <span className="text-[10px] text-blue-400 block font-medium uppercase tracking-wider">Limited</span>
                </div>
              </Link>
              <p className="text-xs leading-relaxed text-slate-400">
                AIR CARGO, SEA SHIPPING, GROUPAGE, FULL CONTAINER AND CLEARING
              </p>
            </div>

            <div className="lg:col-span-1">
              <h4 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">China Office</h4>
              <address className="not-italic text-xs leading-relaxed text-slate-400 space-y-2">
                <p>No.111 Juncture North Station Road and Sha Yong South Rd</p>
                <p>Yueixiu District, Guangzhou</p>
                <div className="pt-2 space-y-1">
                  <p className="flex items-center gap-2"><span className="text-slate-500">BISHOP:</span> <a href="tel:+8613250277859" className="text-slate-300 hover:text-blue-400 transition-colors">+86 13250277859</a></p>
                  <p className="flex items-center gap-2"><span className="text-slate-500">OFFICE LINE:</span> <a href="tel:+8613048001610" className="text-slate-300 hover:text-blue-400 transition-colors">+86 13048001610</a></p>
                </div>
              </address>
            </div>

            <div className="lg:col-span-1">
              <h4 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Warehouse Hub</h4>
              <address className="not-italic text-xs leading-relaxed text-slate-400 space-y-2">
                <p>Warehouse No.111 Juncture North Station South Road and Sha Yong South Rd</p>
                <p>Yueixiu District, Guangzhou</p>
                <div className="pt-2 space-y-1">
                  <p className="flex items-center gap-2"><span className="text-slate-500">CONTACT BISHOP:</span> <a href="tel:+8613250277859" className="text-slate-300 hover:text-blue-400 transition-colors">+86 1325077859</a></p>
                  <p className="flex items-center gap-2"><span className="text-slate-500">OFFICE LINE:</span> <a href="tel:+8613048001610" className="text-slate-300 hover:text-blue-400 transition-colors">+86 13048001610</a></p>
                </div>
              </address>
            </div>

            <div className="lg:col-span-1">
              <h4 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Quick Links</h4>
              <div className="flex flex-col gap-2 text-xs font-medium">
                <Link to="/" className="min-h-[36px] inline-flex items-center hover:text-blue-400 transition-colors w-fit">Home</Link>
                <Link to="/login" className="min-h-[36px] inline-flex items-center hover:text-blue-400 transition-colors w-fit">Client Portal Access</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-8 text-xs text-slate-500 font-medium text-center sm:text-left">
            <p>© {new Date().getFullYear()} Deep Down Logistics Limited. All rights reserved.</p>
            <p>Guangzhou Warehouse Hub • Lagos Clearance Port</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
