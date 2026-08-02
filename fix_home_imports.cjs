const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

content = content.replace('import { Helmet } from "react-helmet-async";', 'import { Helmet } from "react-helmet-async";\nimport { useEffect } from "react";\nimport { doc, getDoc } from "firebase/firestore";\nimport { db } from "../lib/firebase";');

fs.writeFileSync('src/pages/Home.tsx', content);
