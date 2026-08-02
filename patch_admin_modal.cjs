const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Imports
content = content.replace('import { generateAdminManifestPDF } from "../utils/pdfGenerator";', 'import { generateAdminManifestPDF, generateClientManifestPDF } from "../utils/pdfGenerator";');

// State
content = content.replace('const [activeTab, setActiveTab] = useState<"shipments" | "settings">("shipments");', 'const [activeTab, setActiveTab] = useState<"shipments" | "settings">("shipments");\n  const [manifestModal, setManifestModal] = useState<{ isOpen: boolean, containerId: string, shipments: Shipment[] }>({ isOpen: false, containerId: "", shipments: [] });\n  const [manifestOptions, setManifestOptions] = useState({ loadedDate: "", departureDate: "", exchangeRate: "" });');

// Set exchangeRate default from settings if available
content = content.replace('setManifestModal({ isOpen: true, containerId, shipments: containerShipments as Shipment[] })', 'setManifestModal({ isOpen: true, containerId, shipments: containerShipments as Shipment[] }); setManifestOptions({ loadedDate: "", departureDate: "", exchangeRate: settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toString() : "" })');

// Button
const buttonHTML = `
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
`;
content = content.replace('</select>\n                        </td>', '</select>' + buttonHTML + '\n                        </td>');

// Modal
const modalHTML = `
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
`;

content = content.replace('</>)}\n      </main>', '</>)}\n      </main>\n' + modalHTML);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
