#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Paths
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const pkgPath = path.join(rootDir, 'package.json');

// Ensure dist directory exists and is clean
console.log('Cleaning dist directory...');
fs.emptyDirSync(distDir);

// Run TypeScript compiler
console.log('Building TypeScript files...');
try {
    execSync('tsc', { stdio: 'inherit' });
} catch (error) {
    console.error('TypeScript compilation failed');
    process.exit(1);
}

// Make CLI files executable
const cliFile = path.join(distDir, 'cli', 'index.js');
try {
    // Add shebang to CLI file if it doesn't have one
    let cliContent = fs.readFileSync(cliFile, 'utf8');
    if (!cliContent.startsWith('#!/usr/bin/env node')) {
        cliContent = '#!/usr/bin/env node\n' + cliContent;
        fs.writeFileSync(cliFile, cliContent);
    }

    // Make the file executable
    fs.chmodSync(cliFile, '755');
    console.log('Made CLI file executable');
} catch (error) {
    console.warn('Warning: Could not make CLI file executable:', error.message);
}

// Copy README and LICENSE to dist
console.log('Copying documentation files...');
try {
    fs.copyFileSync(path.join(rootDir, 'README.md'), path.join(distDir, 'README.md'));
    if (fs.existsSync(path.join(rootDir, 'LICENSE'))) {
        fs.copyFileSync(path.join(rootDir, 'LICENSE'), path.join(distDir, 'LICENSE'));
    }
} catch (error) {
    console.warn('Warning: Could not copy documentation files:', error.message);
}

console.log('Build completed successfully!');
