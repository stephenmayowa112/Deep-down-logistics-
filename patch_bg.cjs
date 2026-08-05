const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Change root background
content = content.replace(
  '<div className="min-h-screen bg-slate-50 text-slate-700 font-sans flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden">',
  '<div className="min-h-screen bg-blue-50 text-slate-700 font-sans flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden">'
);

// Remove remaining gradients in Hero Section vignette
content = content.replace(
  '<div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/25 to-transparent" />',
  '<div className="absolute inset-0 bg-blue-100/10 mix-blend-overlay" />'
);

// Remove gradients in Services Cards
content = content.replace(
  /<div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50\/30 to-transparent" \/>/g,
  '<div className="absolute inset-0 bg-blue-50/20 mix-blend-overlay" />'
);

// Navbar is already bg-blue-50/90
// Hero is already bg-blue-100
// Next is bg-blue-50

fs.writeFileSync('src/pages/Home.tsx', content);
