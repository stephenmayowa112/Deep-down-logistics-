const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

content = content.replace(
  'import { PlaneTakeoff, Container, useNavigate, Link } from "react-router-dom";',
  'import { useNavigate, Link } from "react-router-dom";'
);

content = content.replace(
  'import { \n  Package, MapPin, Box,',
  'import { \n  Package, MapPin, Box, PlaneTakeoff, Container,'
);

fs.writeFileSync('src/pages/Home.tsx', content);
