const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Imports
content = content.replace('import { Package, Search, Navigation, AlertCircle, ArrowRight, Anchor, Plane, MapPin, CheckCircle2, Factory, ChevronRight, Scale, Shield, Phone, Calculator, Clock, Ship, Check, UploadCloud } from "lucide-react";', 'import { Package, Search, Navigation, AlertCircle, ArrowRight, Anchor, Plane, MapPin, CheckCircle2, Factory, ChevronRight, Scale, Shield, Phone, Calculator, Clock, Ship, Check, UploadCloud } from "lucide-react";\nimport { doc, getDoc } from "firebase/firestore";\nimport { db } from "../lib/firebase";');

content = content.replace('const [rateUsd, setRateUsd] = useState<number>(0);\n  const [rateNgn, setRateNgn] = useState<number>(0);', `const [rateUsd, setRateUsd] = useState<number>(0);\n  const [rateNgn, setRateNgn] = useState<number>(0);\n  const [settings, setSettings] = useState<any>({ exchangeRateUsdNgn: 1500, seaFreightRateUsd: 180, seaClearingRateNgn: 300000, airFreightRateUsd: 8, airClearingRateNgn: 15000 });\n\n  useEffect(() => {\n    const fetchSettings = async () => {\n      try {\n        const docSnap = await getDoc(doc(db, "settings", "pricing"));\n        if (docSnap.exists()) {\n          const data = docSnap.data();\n          setSettings(data);\n          if (freightType === "sea") {\n            setRateUsd(data.seaFreightRateUsd);\n            setRateNgn(data.seaClearingRateNgn);\n          } else {\n            setRateUsd(data.airFreightRateUsd);\n            setRateNgn(data.airClearingRateNgn);\n          }\n        } else {\n          const saved = localStorage.getItem("ddl_mock_settings");\n          if (saved) {\n             const data = JSON.parse(saved);\n             setSettings(data);\n             if (freightType === "sea") {\n               setRateUsd(data.seaFreightRateUsd);\n               setRateNgn(data.seaClearingRateNgn);\n             } else {\n               setRateUsd(data.airFreightRateUsd);\n               setRateNgn(data.airClearingRateNgn);\n             }\n          }\n        }\n      } catch (err) {}\n    };\n    fetchSettings();\n  }, []);\n\n  useEffect(() => {\n    if (freightType === "sea") {\n      setRateUsd(settings.seaFreightRateUsd);\n      setRateNgn(settings.seaClearingRateNgn);\n    } else {\n      setRateUsd(settings.airFreightRateUsd);\n      setRateNgn(settings.airClearingRateNgn);\n    }\n  }, [freightType, settings]);`);

// Now let's inject contact information in the footer or some specific section on the homepage
const contactHTML = `
      {/* CONTACT INFO SECTION */}
      <section className="py-20 relative bg-white border-t border-slate-100" id="contact">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl text-center mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 mb-4">Official Contact & Office Lines</h2>
            <p className="text-slate-600 text-sm">For packing list submission, container manifest inquiries, or general support, reach out to our primary offices.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">China Office (Guangzhou)</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">No.111 Juncture North Station Road and Sha Yong South Road, Yuexiu District, Guangzhou</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-semibold">Bishop:</span> +86 13250277859
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-semibold">Office Line:</span> +86 13048001610
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Nigeria Office (Lagos)</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">B77 Plaza A.P.T. Tradefair International Market, Badagry Express Way, Lagos</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-semibold">Onyemco:</span> 08033085846
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <Package className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-semibold">Email:</span> deepdownlogisticsltd@gmail.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
`;

content = content.replace('{/* FOOTER */}', contactHTML + '\n      {/* FOOTER */}');

fs.writeFileSync('src/pages/Home.tsx', content);
