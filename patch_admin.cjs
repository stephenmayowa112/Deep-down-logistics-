const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Add activeTab state
content = content.replace('const [search, setSearch] = useState("");', 'const [search, setSearch] = useState("");\n  const [activeTab, setActiveTab] = useState<"shipments" | "settings">("shipments");');

// Add Settings States
content = content.replace('const [search, setSearch] = useState("");', 'const [search, setSearch] = useState("");\n  \n  // Settings state\n  const [settings, setSettings] = useState<any>({ exchangeRateUsdNgn: 1500, seaFreightRateUsd: 180, seaClearingRateNgn: 300000, airFreightRateUsd: 8, airClearingRateNgn: 15000 });\n  const [savingSettings, setSavingSettings] = useState(false);');

// Import Settings icon
content = content.replace('import { LogOut, Upload, Package, ArrowRight, Search, Activity, FileSpreadsheet, Download, CheckCircle } from "lucide-react";', 'import { LogOut, Upload, Package, ArrowRight, Search, Activity, FileSpreadsheet, Download, CheckCircle, Settings } from "lucide-react";');

// Add fetchSettings and saveSettings
const settingsFunctions = `
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
`;
content = content.replace('const fetchShipments = async () => {', settingsFunctions + '\n  const fetchShipments = async () => {');

// Fix imports: getDoc, setDoc
content = content.replace('import { collection, query, orderBy, getDocs, doc, writeBatch } from "firebase/firestore";', 'import { collection, query, orderBy, getDocs, doc, writeBatch, getDoc, setDoc } from "firebase/firestore";');

// Add Tabs UI right below header
const tabsUI = `
      <div className="border-b border-slate-200 bg-white px-6 flex items-center gap-6 shrink-0">
        <button
          onClick={() => setActiveTab("shipments")}
          className={\`py-3 text-sm font-medium border-b-2 transition-colors \${activeTab === "shipments" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}\`}
        >
          Shipments
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={\`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 \${activeTab === "settings" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}\`}
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
`;

content = content.replace(/<main className="flex-1 flex flex-col overflow-hidden max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">\s*<div className="flex flex-col md:flex-row/, tabsUI + '\n<div className="flex flex-col md:flex-row');

content = content.replace('</main>', ')}\n      </main>');

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
