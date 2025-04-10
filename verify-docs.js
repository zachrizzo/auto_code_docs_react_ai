// Documentation verification script
const puppeteer = require('puppeteer');

async function verifyDocs(url) {
  console.log(`🧪 Testing documentation at ${url}`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });

  // Check components in the sidebar
  const components = await page.evaluate(() => {
    const componentLinks = Array.from(document.querySelectorAll('.component-link'));
    return componentLinks.map(link => link.textContent.trim());
  });

  console.log('\n📋 Components found in documentation:');
  components.forEach(component => console.log(`  - ${component}`));

  // Check for key recursive examples
  const requiredComponents = [
    'App',
    'Todo',
    'TodoItem',
    'factorial',
    'fibonacci',
    'sumNestedArray',
    'RecursiveTreeProcessor',
    'CommentThread',
    'deepClone',
    'DocumentAll'  // Our new comprehensive component
  ];

  const missingComponents = requiredComponents.filter(
    comp => !components.includes(comp)
  );

  if (missingComponents.length === 0) {
    console.log('\n✅ SUCCESS: All required components are present in the documentation!');
  } else {
    console.log('\n❌ ERROR: The following components are missing from the documentation:');
    missingComponents.forEach(comp => console.log(`  - ${comp}`));
  }

  await browser.close();
}

// Script can be run directly or imported
if (require.main === module) {
  const port = process.argv[2] || 8080;
  verifyDocs(`http://localhost:${port}`).catch(console.error);
}

module.exports = { verifyDocs };
