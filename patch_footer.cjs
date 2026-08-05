const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const oldFooter = `<footer className="bg-[#05080f] border-t border-slate-100 py-12 relative z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-8 border-b border-slate-100">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 clay-card-blue flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-sm text-slate-900 block">Deep Down Logistics</span>
                <span className="text-[9px] text-slate-500 block">China to West Africa Cargo Freight</span>
              </div>
            </Link>
            
            <div className="flex gap-8 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
              <a href="#services" className="hover:text-slate-900 transition-colors">Services</a>
              <a href="#estimator" className="hover:text-slate-900 transition-colors">Estimator</a>
              <a href="#how-it-works" className="hover:text-slate-900 transition-colors">Process</a>
              <Link to="/login" className="hover:text-slate-900 transition-colors">Portal Access</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 text-[10px] text-slate-500 font-medium">
            <p>© 2026 Deep Down Logistics. Registered air & sea forwarding service.</p>
            <p className="flex items-center gap-1">
              Guangzhou Warehouse Hub • Lagos Clearance Port
            </p>
          </div>
        </div>
      </footer>`;

const newFooter = `<footer className="bg-slate-900 text-slate-400 py-16 relative z-10 shrink-0 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12 border-b border-slate-800">
            
            <div className="lg:col-span-1">
              <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity mb-4">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-white block">Deep Down Logistics</span>
                  <span className="text-[9px] text-blue-400 block font-medium uppercase tracking-wider">Limited</span>
                </div>
              </Link>
              <p className="text-[10px] leading-relaxed text-slate-500">
                AIR CARGO, SEA SHIPPING, GROUPAGE, FULL CONTAINER AND CLEARING
              </p>
            </div>

            <div className="lg:col-span-1">
              <h4 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">China Office</h4>
              <address className="not-italic text-[11px] leading-relaxed text-slate-400 space-y-2">
                <p>No.111 Juncture North Station Road and Sha Yong South Rd</p>
                <p>Yueixiu District, Guangzhou</p>
                <div className="pt-2">
                  <p className="flex items-center gap-2"><span className="text-slate-500">BISHOP:</span> +86 13250277859</p>
                  <p className="flex items-center gap-2"><span className="text-slate-500">OFFICE LINE:</span> +86 13048001610</p>
                </div>
              </address>
            </div>

            <div className="lg:col-span-1">
              <h4 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Warehouse Hub</h4>
              <address className="not-italic text-[11px] leading-relaxed text-slate-400 space-y-2">
                <p>Warehouse No.111 Juncture North Station South Road and Sha Yong South Rd</p>
                <p>Yueixiu District, Guangzhou</p>
                <div className="pt-2">
                  <p className="flex items-center gap-2"><span className="text-slate-500">CONTACT BISHOP:</span> +86 1325077859</p>
                  <p className="flex items-center gap-2"><span className="text-slate-500">OFFICE LINE:</span> +86 13048001610</p>
                </div>
              </address>
            </div>

            <div className="lg:col-span-1">
              <h4 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Quick Links</h4>
              <div className="flex flex-col gap-2 text-[11px] font-medium">
                <a href="#services" className="hover:text-blue-400 transition-colors w-fit">Our Services</a>
                <a href="#estimator" className="hover:text-blue-400 transition-colors w-fit">Cost Estimator</a>
                <a href="#how-it-works" className="hover:text-blue-400 transition-colors w-fit">Shipping Process</a>
                <Link to="/login" className="hover:text-blue-400 transition-colors w-fit">Client Portal Access</Link>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 text-[10px] text-slate-600 font-medium">
            <p>© {new Date().getFullYear()} Deep Down Logistics Limited. All rights reserved.</p>
            <p>Guangzhou Warehouse Hub • Lagos Clearance Port</p>
          </div>
        </div>
      </footer>`;

content = content.replace(oldFooter, newFooter);
fs.writeFileSync('src/pages/Home.tsx', content);
