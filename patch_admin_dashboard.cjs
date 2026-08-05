const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// State
content = content.replace(
  'const [manifestOptions, setManifestOptions] = useState({ loadedDate: "", departureDate: "", exchangeRate: "" });',
  'const [manifestOptions, setManifestOptions] = useState({ loadedDate: "", departureDate: "", exchangeRate: "", freightRate: "", clearingRate: "" });'
);

// Button click initialization
content = content.replace(
  'setManifestOptions({ loadedDate: "", departureDate: "", exchangeRate: settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toString() : "" })',
  'setManifestOptions({ loadedDate: "", departureDate: "", exchangeRate: settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toString() : "", freightRate: settings?.seaFreightRateUsd ? settings.seaFreightRateUsd.toString() : "", clearingRate: settings?.seaClearingRateNgn ? settings.seaClearingRateNgn.toString() : "" })'
);

content = content.replace(
  'setManifestOptions({ loadedDate: "", departureDate: "", exchangeRate: settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toString() : "" });',
  'setManifestOptions({ loadedDate: "", departureDate: "", exchangeRate: settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toString() : "", freightRate: settings?.seaFreightRateUsd ? settings.seaFreightRateUsd.toString() : "", clearingRate: settings?.seaClearingRateNgn ? settings.seaClearingRateNgn.toString() : "" });'
);

// Modal UI
const modalInputs = `              <div>
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
              </div>`;

content = content.replace(
  /<div>\s*<label className="block text-xs font-semibold text-slate-700 mb-1">Exchange Rate \(USD\/NGN\)<\/label>\s*<input type="text" placeholder="e\.g\., 1500" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-blue-500" value=\{manifestOptions\.exchangeRate\} onChange=\{e => setManifestOptions\(\{\.\.\.manifestOptions, exchangeRate: e\.target\.value\}\)\} \/>\s*<\/div>/,
  modalInputs
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
