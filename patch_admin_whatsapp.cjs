const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const settingsState = `  // Settings state
  const [settings, setSettings] = useState<any>({ exchangeRateUsdNgn: 1500, seaFreightRateUsd: 180, seaClearingRateNgn: 300000, airFreightRateUsd: 8, airClearingRateNgn: 15000 });`;
const newSettingsState = settingsState + `
  const [testWhatsAppPhone, setTestWhatsAppPhone] = useState("");
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
`;
content = content.replace(settingsState, newSettingsState);

const saveSettingsFunction = `  const saveSettings = async () => {`;
const newTestWhatsAppFunction = `  const testWhatsApp = async () => {
    if (!testWhatsAppPhone) return toast.error("Please enter a phone number");
    setTestingWhatsApp(true);
    try {
      const res = await fetch("/api/notify-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: testWhatsAppPhone,
          shipping_mark: "TEST-MARK-001",
          tracking_id: "DDL-TEST-12345",
          container_number: "TESTU1234567",
          ctn: 1,
          cbm: 0.5,
          freight_usd_per_cbm: 180,
          clearing_naira_per_cbm: 300000,
          status: "shipped"
        })
      });
      const data = await res.json();
      if (res.ok && data.sent) {
        toast.success("Test WhatsApp message sent!");
      } else {
        toast.error(data.error || "Failed to send message");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const saveSettings = async () => {`;
content = content.replace(saveSettingsFunction, newTestWhatsAppFunction);

const settingsJSX = `<h2 className="text-lg font-semibold text-slate-900 mb-4">Pricing & Calculator Settings</h2>`;
const newSettingsJSX = `<div className="mb-8 border-b border-slate-100 pb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">WhatsApp Integration</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="Phone Number (e.g. 2348012345678)" 
                  value={testWhatsAppPhone}
                  onChange={e => setTestWhatsAppPhone(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-emerald-500 flex-1 max-w-xs"
                />
                <button 
                  onClick={testWhatsApp} 
                  disabled={testingWhatsApp || !testWhatsAppPhone} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {testingWhatsApp ? "Sending..." : "Send Test Message"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This will send a mock "Shipped" status update using the template configured in WHATSAPP_TEMPLATE_NAME.
              </p>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Pricing & Calculator Settings</h2>`;

content = content.replace(settingsJSX, newSettingsJSX);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
