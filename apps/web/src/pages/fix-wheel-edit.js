const fs = require('fs');

// Read the file
const filePath = 'WheelEdit.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the initial state reference to wheel.name
content = content.replace(
  /footerText: `© \${new Date\(\)\.getFullYear\(\)} \${wheel\.name}`/g, 
  'footerText: `© ${new Date().getFullYear()} IZI Wheel`'
);

// Fix the wheelName variable that references wheel.name
content = content.replace(
  /const wheelName = wheel\.name && wheel\.name\.trim\(\) !== '' \?\s*wheel\.name : 'Nouvelle roue';/g,
  "const wheelName = 'Nouvelle roue';"
);

// Fix any references to wheelName in the footerText
content = content.replace(
  /footerText: `© \${new Date\(\)\.getFullYear\(\)} \${wheelName}`/g,
  'footerText: `© ${new Date().getFullYear()} IZI Wheel`'
);

// Write the fixed content back to the file
fs.writeFileSync(filePath, content);

console.log('Fixed circular references in WheelEdit.tsx'); 