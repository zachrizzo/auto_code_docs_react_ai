const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'ui', 'components', 'ui');

// Get all .tsx files in the components directory
const files = fs.readdirSync(componentsDir).filter(file => file.endsWith('.tsx'));

// Process each file
files.forEach(file => {
    const filePath = path.join(componentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace import paths
    content = content.replace(/from "src\/lib\/utils"/g, 'from "../../../lib/utils"');
    content = content.replace(/from "src\/ui\/components\/ui\/([^"]+)"/g, 'from "./$1"');

    // Add React import for files with JSX but no React import
    if ((content.includes('return <') || content.includes('<div')) && !content.includes('import * as React') && !content.includes('import React')) {
        content = 'import * as React from "react"\n\n' + content;
    }

    // Write the updated content back to the file
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in ${file}`);
});

console.log('All imports fixed!');
