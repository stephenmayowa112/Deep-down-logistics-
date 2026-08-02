const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

content = content.replace('{activeTab === "shipments" && (\\n\\n<div className="flex flex-col md:flex-row justify-between', '{activeTab === "shipments" && (\\n<>\\n<div className="flex flex-col md:flex-row justify-between');

content = content.replace('{activeTab === "shipments" && (\n\n<div className="flex flex-col md:flex-row justify-between', '{activeTab === "shipments" && (\n<>\n<div className="flex flex-col md:flex-row justify-between');


content = content.replace('        </div>\n      )}\n      </main>', '        </div>\n      </>)}\n      </main>');

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
