const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const target1 = `<div className="h-32 w-full relative overflow-hidden bg-slate-950">
                <img 
                  src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=600&q=80" 
                  alt="Express Air Cargo" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-blue-50/20 mix-blend-overlay" />
              </div>`;
const replace1 = `<div className="h-32 w-full relative overflow-hidden bg-blue-50 flex items-center justify-center border-b border-blue-100">
                <Plane className="w-16 h-16 text-blue-300 group-hover:scale-110 group-hover:text-blue-400 transition-all duration-500" />
              </div>`;

const target2 = `<div className="h-32 w-full relative overflow-hidden bg-slate-950">
                <img 
                  src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=600&q=80" 
                  alt="Ocean Freight" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-blue-50/20 mix-blend-overlay" />
              </div>`;
const replace2 = `<div className="h-32 w-full relative overflow-hidden bg-indigo-50 flex items-center justify-center border-b border-indigo-100">
                <Ship className="w-16 h-16 text-indigo-300 group-hover:scale-110 group-hover:text-indigo-400 transition-all duration-500" />
              </div>`;

const target3 = `<div className="h-32 w-full relative overflow-hidden bg-slate-950">
                <img 
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80" 
                  alt="Guangzhou Warehousing" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-blue-50/20 mix-blend-overlay" />
              </div>`;
const replace3 = `<div className="h-32 w-full relative overflow-hidden bg-amber-50 flex items-center justify-center border-b border-amber-100">
                <Warehouse className="w-16 h-16 text-amber-300 group-hover:scale-110 group-hover:text-amber-400 transition-all duration-500" />
              </div>`;

const target4 = `<div className="h-32 w-full relative overflow-hidden bg-slate-950">
                <img 
                  src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80" 
                  alt="Lagos Port Clearance" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-blue-50/20 mix-blend-overlay" />
              </div>`;
const replace4 = `<div className="h-32 w-full relative overflow-hidden bg-emerald-50 flex items-center justify-center border-b border-emerald-100">
                <ShieldCheck className="w-16 h-16 text-emerald-300 group-hover:scale-110 group-hover:text-emerald-400 transition-all duration-500" />
              </div>`;

content = content.replace(target1, replace1);
content = content.replace(target2, replace2);
content = content.replace(target3, replace3);
content = content.replace(target4, replace4);

fs.writeFileSync('src/pages/Home.tsx', content);
