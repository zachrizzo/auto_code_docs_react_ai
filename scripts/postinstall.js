#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function checkPython() {
  const candidates = ['python3', 'python', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3.8'];
  
  for (const candidate of candidates) {
    const result = await testPythonCommand(candidate);
    if (result.works) {
      return { command: candidate, version: result.version };
    }
  }
  
  return null;
}

async function testPythonCommand(pythonCmd) {
  return new Promise((resolve) => {
    const proc = spawn(pythonCmd, ['--version'], { stdio: 'pipe' });
    
    let output = '';
    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr?.on('data', (data) => {
      output += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0 && output.includes('Python')) {
        // Check if it's Python 3.8+
        const versionMatch = output.match(/Python (\d+)\.(\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1]);
          const minor = parseInt(versionMatch[2]);
          const patch = parseInt(versionMatch[3]);
          if (major >= 3 && minor >= 8) {
            resolve({ 
              works: true, 
              version: `${major}.${minor}.${patch}` 
            });
            return;
          }
        }
      }
      resolve({ works: false, version: null });
    });
    
    proc.on('error', () => {
      resolve({ works: false, version: null });
    });
  });
}

async function main() {
  console.log('🔍 Checking for Python installation...');
  
  const pythonResult = await checkPython();
  
  if (pythonResult) {
    console.log(`✅ Found Python ${pythonResult.version}: ${pythonResult.command}`);
    console.log('🎉 code-y is ready to use with AI features!');
    console.log('');
    console.log('Quick start:');
    console.log('  npx code-y generate');
    console.log('');
    console.log('The embedded AI server will automatically:');
    console.log('  • Install required packages (FastAPI, sentence-transformers, etc.)');
    console.log('  • Start vector database for code similarity search');
    console.log('  • Provide intelligent chat about your codebase');
    console.log('');
    console.log('For enhanced visual flow programming, you can also install Docker:');
    console.log('  https://www.docker.com/get-started');
  } else {
    console.log('⚠️  Python 3.8+ not found');
    console.log('');
    console.log('code-y will work with basic documentation generation,');
    console.log('but AI features require Python 3.8+ or Docker.');
    console.log('');
    console.log('To enable AI features, choose one option:');
    console.log('');
    console.log('Option 1 - Install Python (Recommended):');
    console.log('  • macOS: brew install python');
    console.log('  • Windows: https://python.org/downloads');
    console.log('  • Linux: sudo apt install python3 python3-pip');
    console.log('');
    console.log('Option 2 - Install Docker:');
    console.log('  • https://www.docker.com/get-started');
    console.log('');
    console.log('Then run: npx code-y generate');
  }
}

main().catch(console.error);