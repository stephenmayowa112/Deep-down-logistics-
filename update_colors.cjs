const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// 1. Navbar
content = content.replace(
  'className="sticky top-0 z-50 backdrop-blur-xl bg-slate-50/75 border-b border-slate-100 transition-all"',
  'className="sticky top-0 z-50 backdrop-blur-xl bg-blue-50/90 border-b border-blue-100 transition-all"'
);

// 2. Hero Section
content = content.replace(
  '<section className="relative pt-12 pb-20 sm:pb-28 overflow-hidden">',
  '<section className="relative pt-12 pb-20 sm:pb-28 overflow-hidden bg-blue-100">'
);

// 3. Stats Section
content = content.replace(
  '<section className="py-8 bg-white/2 border-y border-slate-100 backdrop-blur-md">',
  '<section className="py-8 bg-blue-50 border-y border-blue-100 backdrop-blur-md">'
);

// 4. Services Section
content = content.replace(
  '<section id="services" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">',
  '<section id="services" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">' // No background here originally, maybe it's in a wrapper or just white?
);

// Looking at Home.tsx, the body or app has bg-slate-50 probably? No, wait. 
// 5. Estimator Section
content = content.replace(
  '<section id="estimator" className="py-20 bg-white/[0.01] border-y border-slate-100 relative">',
  '<section id="estimator" className="py-20 bg-blue-100 border-y border-blue-200 relative">'
);

// 6. Contact Section
content = content.replace(
  '<section id="contact" className="py-20 bg-[#05080f]/5 border-t border-slate-100">',
  '<section id="contact" className="py-20 bg-blue-100 border-t border-blue-200">'
);

// Text gradient in Hero
content = content.replace(
  '<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">',
  '<span className="text-blue-700">'
);

// Text gradient in Estimator
content = content.replace(
  '<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 font-bold font-display text-xs">',
  '<span className="text-blue-700 font-bold font-display text-xs">'
);

fs.writeFileSync('src/pages/Home.tsx', content);
