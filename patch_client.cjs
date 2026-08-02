const fs = require('fs');

let content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

// Add setting state
content = content.replace('const [shipments, setShipments] = useState<Shipment[]>([]);', 'const [shipments, setShipments] = useState<Shipment[]>([]);\n  const [settings, setSettings] = useState<any>(null);');

const fetchSettingsHook = `
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
      } catch (err) {}
    };
    fetchSettings();
  }, [isMock]);
`;

content = content.replace('useEffect(() => {', fetchSettingsHook + '\n  useEffect(() => {');
content = content.replace('import { collection, query, where, getDocs } from "firebase/firestore";', 'import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";');

content = content.replace(/generateClientManifestPDF\(([^,]+),\s*([^,]+),\s*shipments\)/, 'generateClientManifestPDF($1, $2, shipments, settings)');
content = content.replace(/generateClientManifestPDF\(([^,]+),\s*([^,]+),\s*\[shipment\]\)/, 'generateClientManifestPDF($1, $2, [shipment], settings)');

fs.writeFileSync('src/pages/ClientDashboard.tsx', content);
