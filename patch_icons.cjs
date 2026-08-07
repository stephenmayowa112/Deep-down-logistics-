const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Add imports
if (!content.includes('PlaneTakeoff')) {
  content = content.replace('import {', 'import { PlaneTakeoff, Container,');
}

// Card 1
const card1Target = `<div className="h-32 w-full relative overflow-hidden bg-blue-50 flex items-center justify-center border-b border-blue-100">
                <Plane className="w-16 h-16 text-blue-300 group-hover:scale-110 group-hover:text-blue-400 transition-all duration-500" />
              </div>`;
const card1Replace = `<div className="h-32 w-full relative overflow-hidden bg-blue-50 flex items-center justify-center border-b border-blue-100">
                <PlaneTakeoff className="w-16 h-16 text-blue-300 group-hover:scale-110 group-hover:text-blue-400 transition-all duration-500" />
              </div>`;
content = content.replace(card1Target, card1Replace);

const card1SmallTarget = `<div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
                      <Plane className="w-4 h-4" />
                    </div>`;
const card1SmallReplace = `<div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
                      <PlaneTakeoff className="w-4 h-4" />
                    </div>`;
content = content.replace(card1SmallTarget, card1SmallReplace);

// Card 2
const card2Target = `<div className="h-32 w-full relative overflow-hidden bg-indigo-50 flex items-center justify-center border-b border-indigo-100">
                <Ship className="w-16 h-16 text-indigo-300 group-hover:scale-110 group-hover:text-indigo-400 transition-all duration-500" />
              </div>`;
const card2Replace = `<div className="h-32 w-full relative overflow-hidden bg-indigo-50 flex items-center justify-center border-b border-indigo-100">
                <Container className="w-16 h-16 text-indigo-300 group-hover:scale-110 group-hover:text-indigo-400 transition-all duration-500" />
              </div>`;
content = content.replace(card2Target, card2Replace);

const card2SmallTarget = `<div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner">
                      <Ship className="w-4 h-4" />
                    </div>`;
const card2SmallReplace = `<div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner">
                      <Container className="w-4 h-4" />
                    </div>`;
content = content.replace(card2SmallTarget, card2SmallReplace);

fs.writeFileSync('src/pages/Home.tsx', content);
