const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const contactSection = `
        {/* Contact Section */}
        <section id="contact" className="py-20 bg-[#05080f]/5 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
                Our Offices & Hubs
              </h2>
              <p className="mt-3 text-xs text-slate-600">
                AIR CARGO, SEA SHIPPING, GROUPAGE, FULL CONTAINER AND CLEARING.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* China Office */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50" />
                <h3 className="text-sm font-bold text-slate-900 font-display mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  China Office
                </h3>
                <address className="not-italic text-xs text-slate-600 space-y-3 leading-relaxed">
                  <p>
                    No.111 Juncture North Station Road<br/>
                    and Sha Yong South Rd<br/>
                    Yueixiu District, Guangzhou
                  </p>
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="text-slate-400 w-24">BISHOP:</span>
                      <span className="text-slate-800">+86 13250277859</span>
                    </p>
                    <p className="flex items-center gap-2 font-medium">
                      <span className="text-slate-400 w-24">OFFICE LINE:</span>
                      <span className="text-slate-800">+86 13048001610</span>
                    </p>
                  </div>
                </address>
              </div>

              {/* Warehouse */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 opacity-50" />
                <h3 className="text-sm font-bold text-slate-900 font-display mb-4 flex items-center gap-2">
                  <Box className="w-5 h-5 text-emerald-500" />
                  Warehouse Hub
                </h3>
                <address className="not-italic text-xs text-slate-600 space-y-3 leading-relaxed">
                  <p>
                    Warehouse No.111 Juncture North Station<br/>
                    South Road and Sha Yong South Rd<br/>
                    Yueixiu District, Guangzhou
                  </p>
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="text-slate-400 w-24">CONTACT BISHOP:</span>
                      <span className="text-slate-800">+86 1325077859</span>
                    </p>
                    <p className="flex items-center gap-2 font-medium">
                      <span className="text-slate-400 w-24">OFFICE LINE:</span>
                      <span className="text-slate-800">+86 13048001610</span>
                    </p>
                  </div>
                </address>
              </div>
            </div>
          </div>
        </section>
      </main>`;

content = content.replace('</main>', contactSection);

// Update Quick Links in Footer to include Contact
content = content.replace(
  '<a href="#how-it-works" className="hover:text-blue-400 transition-colors w-fit">Shipping Process</a>',
  '<a href="#how-it-works" className="hover:text-blue-400 transition-colors w-fit">Shipping Process</a>\n                <a href="#contact" className="hover:text-blue-400 transition-colors w-fit">Contact Offices</a>'
);

// Add MapPin import to Home.tsx if not exists
if (!content.includes('MapPin')) {
  content = content.replace('import { Package, Search,', 'import { Package, Search, MapPin,');
}
if (!content.includes('Box')) {
  content = content.replace('import { Package, Search, MapPin,', 'import { Package, Search, MapPin, Box,');
}

fs.writeFileSync('src/pages/Home.tsx', content);
