import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../contexts/AuthContext";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, doc, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { LogOut, Package, ArrowRight, ExternalLink, Download, FileText } from "lucide-react";
import { PricingSettings, Shipment } from "../types";
import { generateClientManifestPDF } from "../utils/pdfGenerator";
import { toast } from "sonner";

function getPhoneVariants(phone: string): string[] {
  const raw = phone.trim();
  const digits = raw.replace(/[^\d]/g, "");
  const variants = new Set<string>();
  if (raw) variants.add(raw);
  if (digits) variants.add(digits);

  let core = digits;
  if (core.startsWith("234") && core.length > 3) {
    core = core.slice(3);
  } else if (core.startsWith("0") && core.length > 1) {
    core = core.slice(1);
  }

  if (core) {
    variants.add(core);
    variants.add(`0${core}`);
    variants.add(`234${core}`);
    variants.add(`+234${core}`);
  }

  return Array.from(variants).slice(0, 10);
}

export default function ClientDashboard() {
  const { dbUser } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "pricing"),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as PricingSettings);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "settings/pricing");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!dbUser?.phone_number) {
      setShipments([]);
      setLoading(false);
      return;
    }

    const variants = getPhoneVariants(dbUser.phone_number);
    if (variants.length === 0) {
      setShipments([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "shipments"),
      where("phone_number", "in", variants)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Shipment[];

        data.sort((a, b) => b.created_at - a.created_at);
        setShipments(data);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, "shipments");
      }
    );

    return () => unsubscribe();
  }, [dbUser]);

  const getStatusColor = (status: string) => {
    if (status.includes("delivered")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (status.includes("cleared") || status.includes("ready")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (status.includes("transit")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (status.includes("received_china")) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-slate-200 text-slate-700 border-transparent";
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-700 flex flex-col font-sans overflow-x-clip">
      <Helmet>
        <title>Client Dashboard - Deep Down Logistics</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 bg-slate-50 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-90 transition-opacity min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/15 shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-slate-900 truncate">Deep Down Logistics</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-slate-900">{dbUser?.shipping_mark}</div>
            <div className="text-xs text-slate-500">{dbUser?.phone_number}</div>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {(dbUser?.shipping_mark || dbUser?.phone_number) && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-900 truncate">
            Mark: <span className="font-mono">{dbUser?.shipping_mark || "—"}</span>
          </span>
          <span className="text-slate-600 font-mono shrink-0">{dbUser?.phone_number}</span>
        </div>
      )}

      <main className="flex-1 flex flex-col max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 w-full">
        <div className="mb-5 sm:mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900">My Shipments</h1>
            <p className="text-xs text-slate-600 mt-1">Track and manage your incoming cargo in real time.</p>
          </div>
          {shipments.length > 0 && (
            <button
              onClick={() => generateClientManifestPDF(dbUser?.shipping_mark || "UNMARKED", dbUser?.phone_number || "", shipments, settings)}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] sm:min-h-[38px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 sm:hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              Download All (PDF Manifest)
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : shipments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-slate-800">No shipments found</h3>
            <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              We couldn't find any active shipments linked to your phone number ({dbUser?.phone_number}).
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="bg-white rounded-xl border border-slate-200 flex flex-col group hover:border-slate-300 transition-colors shadow-sm">
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${getStatusColor(shipment.status)}`}>
                      {shipment.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {format(shipment.created_at, "MMM d")}
                    </span>
                  </div>
                  <h3 className="font-mono text-sm font-semibold text-slate-900 mb-1 break-all">{shipment.tracking_id}</h3>
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                      <span className="font-medium text-slate-800">{shipment.cbm} CBM</span>
                      <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                      <span>{shipment.ctn} CTN</span>
                    </div>
                    {(shipment.freight_usd_per_cbm || shipment.clearing_naira_per_cbm) && (
                      <div className="flex flex-col gap-1 text-xs bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 mt-1 tabular-nums">
                        {shipment.freight_usd_per_cbm && shipment.freight_usd_per_cbm > 0 && (
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-600">Est. Freight (USD):</span>
                            <span className="text-blue-600 font-semibold">${(shipment.cbm * shipment.freight_usd_per_cbm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {shipment.clearing_naira_per_cbm && shipment.clearing_naira_per_cbm > 0 && (
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-600">Est. Clearing (NGN):</span>
                            <span className="text-emerald-600 font-semibold">₦{(shipment.cbm * shipment.clearing_naira_per_cbm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-200 bg-slate-50/60 px-3 py-2 flex justify-between items-center rounded-b-xl">
                  <Link
                    to={`/track/${shipment.tracking_id}`}
                    className="min-h-[40px] px-1.5 text-xs font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => generateClientManifestPDF(shipment.shipping_mark || "UNMARKED", shipment.phone_number || "", [shipment], settings)}
                      className="min-h-[40px] px-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 rounded-lg transition-colors flex items-center gap-1.5"
                      title="Download PDF Receipt / Note"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Receipt PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/track/${shipment.tracking_id}`);
                        toast.success("Tracking link copied to clipboard!");
                      }}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50/70 rounded-lg transition-colors"
                      title="Copy Public Tracking Link"
                      aria-label="Copy Public Tracking Link"
                    >
                      <ExternalLink className="w-4 h-4" />
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
