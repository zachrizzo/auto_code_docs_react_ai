#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Paths
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const srcDir = path.join(rootDir, 'src');
const uiSrcDir = path.join(srcDir, 'ui');
const uiDistDir = path.join(distDir, 'ui');
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

// Copy UI files to dist/ui if they exist
console.log('Copying UI files to dist...');
try {
    if (fs.existsSync(uiSrcDir)) {
        // Clean existing compiled UI artifacts before copying
        fs.emptyDirSync(uiDistDir);
        // Ensure the ui dist directory exists
        fs.ensureDirSync(uiDistDir);

        // Copy all UI files
        fs.copySync(uiSrcDir, uiDistDir, {
            filter: (src) => {
                // Exclude any node_modules
                if (src.includes('node_modules')) return false;
                // Always include UI root dir
                const rel = path.relative(uiSrcDir, src);
                if (rel === "") return true;
                const base = path.basename(src);
                const ext = path.extname(src);
                // Skip compiled artifacts and original mjs config
                if (ext === ".js" || ext === ".js.map" || ext === ".d.ts" || base === "postcss.config.mjs") {
                    return false;
                }
                return true;
            }
        });

        console.log('UI files copied successfully');

        // Merge original src UI package.json dependencies and scripts
        const srcUiPkgPath = path.join(uiSrcDir, 'package.json');
        let srcUiPkg = {};
        try {
            srcUiPkg = fs.readJsonSync(srcUiPkgPath);
        } catch (err) {
            console.warn('Could not read src UI package.json:', err.message);
        }
        const uiPackageJson = {
            name: srcUiPkg.name || 'docs-ui',
            version: srcUiPkg.version || '1.0.0',
            private: true,
            scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                ...srcUiPkg.scripts
            },
            dependencies: {
                ...srcUiPkg.dependencies,
                autoprefixer: '^10.4.21',
                postcss: '^8.5.3',
                '@tailwindcss/postcss': '*',
                tailwindcss: '^4.1.3',
                'tailwindcss-animate': '^1.0.7',
                'tailwind-merge': '^3.2.0',
                '@tailwindcss/forms': '^0.5.7',
                '@tailwindcss/typography': '^0.5.10'
            }
        };

        fs.writeJsonSync(path.join(uiDistDir, 'package.json'), uiPackageJson, { spaces: 2 });
        console.log('Created UI package.json');

        // Create a postcss.config.js file
        const postcssConfig = `
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
}
`;
        fs.writeFileSync(path.join(uiDistDir, 'postcss.config.js'), postcssConfig);
        console.log('Created postcss.config.js');

        // Generate tailwind.config.js from TS config
        const tsConfigPath = path.join(uiSrcDir, 'tailwind.config.ts');
        if (fs.existsSync(tsConfigPath)) {
            let tailwindTs = fs.readFileSync(tsConfigPath, 'utf8');
            // Strip TypeScript-specific syntax
            tailwindTs = tailwindTs.replace(/import type .*;[\r\n]*/g, '');
            tailwindTs = tailwindTs.replace(/\s+satisfies\s+Config\s*/g, '');
            tailwindTs = tailwindTs.replace(/export default config;?/, 'module.exports = config;');
            // Make sure colors are properly recognized
            tailwindTs = tailwindTs.replace(/theme: {/, `theme: {
  colors: {
    transparent: 'transparent',
    current: 'currentColor',
    white: '#ffffff',
    black: '#000000',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
  },`);
            fs.writeFileSync(path.join(uiDistDir, 'tailwind.config.js'), tailwindTs);
            console.log('Generated tailwind.config.js from tailwind.config.ts');

            // Patch globals.css to replace invalid border-border utility
            const globalsCss = path.join(uiDistDir, 'app', 'globals.css');
            if (fs.existsSync(globalsCss)) {
                let contentCss = fs.readFileSync(globalsCss, 'utf8');
                contentCss = contentCss.replace(/@apply border-border;/g, '@apply border; border-color: hsl(var(--border));');
                contentCss = contentCss.replace(/@apply bg-background/g, '@apply bg-white dark:bg-gray-950');
                contentCss = contentCss.replace(/@apply text-foreground/g, '@apply text-gray-950 dark:text-gray-50');
                fs.writeFileSync(globalsCss, contentCss);
                console.log('Patched globals.css to use standard Tailwind colors');
            }
        }
    } else {
        console.warn('Warning: UI directory not found at', uiSrcDir);
    }
} catch (error) {
    console.warn('Warning: Could not copy UI files:', error.message);
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
