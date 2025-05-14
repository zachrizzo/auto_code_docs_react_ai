const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

// Function to run a command and log output
function runCommand(command, cwd = process.cwd()) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', cwd });
    return true;
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Main build function
async function build() {
  try {
    console.log('Transpiling TypeScript files using tsc...');
    // Ensure dist directory is clean
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    // Run the TypeScript compiler
    runCommand('npx tsc --project tsconfig.json');

    // Copy package.json to dist
    console.log('Copying package.json to dist...');
    fs.copySync('package.json', 'dist/package.json');

    // Make the CLI executable
    console.log('Making CLI executable...');
    const cliPath = path.join(process.cwd(), 'dist/cli/index.js');
    if (fs.existsSync(cliPath)) {
      const content = fs.readFileSync(cliPath, 'utf8');
      if (!content.startsWith('#!/usr/bin/env node')) {
        fs.writeFileSync(cliPath, '#!/usr/bin/env node\n' + content);
      }
      fs.chmodSync(cliPath, '755');
    }

    console.log('Build completed successfully!');
    return true;
  } catch (error) {
    console.error('Build failed:', error);
    return false;
  }
}


// Run the build
build().then(success => {
  if (!success) {
    process.exit(1);
  }
});
