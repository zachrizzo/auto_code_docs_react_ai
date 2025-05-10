#!/usr/bin/env node

const path = require('path');
const startServer = require('../server');

// Parse command line arguments
const args = process.argv.slice(2);
let port = 4000;
let docsDataDir = process.cwd() + '/documentation/docs-data';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--docs-data-dir' && args[i + 1]) {
    docsDataDir = args[i + 1];
    i++;
  }
}

// Start the server
console.log('Starting documentation server...');
console.log('Docs data directory: ' + docsDataDir);
console.log('Port: ' + port);

startServer({
  port,
  docsDataDir
}).catch(err => {
  console.error('Error starting documentation server:', err);
  process.exit(1);
});
