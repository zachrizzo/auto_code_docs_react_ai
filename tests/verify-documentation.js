/**
 * Documentation UI Verification Test Script
 *
 * This script automatically verifies the generated documentation,
 * checking that all expected components are present and properly displayed.
 */

const puppeteer = require('puppeteer');
const http = require('http');

// List of required components that must be present in the documentation
const REQUIRED_COMPONENTS = [
    'App',
    'Todo',
    'TodoItem',
    'factorial',
    'fibonacci',
    'sumNestedArray',
    'RecursiveTreeProcessor',
    'CommentThread',
    'deepClone',
    'DocumentAll',
    'FibonacciExample',
    // Hospital test functions
    'calculatePatientCost',
    'findPatient',
    'buildHospitalOrgChart'
];

/**
 * Wait for server to be available
 * @param {string} url The URL to wait for
 * @param {number} maxAttempts Maximum number of retry attempts
 * @param {number} interval Interval between attempts in ms
 * @returns {Promise<boolean>} True if server becomes available
 */
async function waitForServer(url, maxAttempts = 10, interval = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(url, (res) => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        reject(new Error(`Status code: ${res.statusCode}`));
                    }
                    res.resume(); // Consume response data to free up memory
                });

                req.on('error', reject);
                req.end();
            });

            console.log(`✅ Server at ${url} is available`);
            return true;
        } catch (error) {
            console.log(`⏳ Waiting for server to be available (attempt ${i + 1}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    console.error(`❌ Server at ${url} did not become available after ${maxAttempts} attempts`);
    return false;
}

/**
 * Verify the documentation for completeness
 * @param {string} url The documentation URL to verify
 * @returns {Promise<{success: boolean, missingComponents: string[]}>} Test results
 */
async function verifyDocumentation(url) {
    console.log(`🧪 Testing documentation at ${url}`);

    // Wait for server to be available
    const serverAvailable = await waitForServer(url);
    if (!serverAvailable) {
        return { success: false, missingComponents: ['Server not available'] };
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Take a screenshot for debugging
    await page.screenshot({ path: 'documentation-verification.png' });
    console.log('📸 Screenshot saved to documentation-verification.png');

    // Check components in the sidebar
    const components = await page.evaluate(() => {
        const componentLinks = Array.from(document.querySelectorAll('.component-link'));
        return componentLinks.map(link => link.textContent.trim());
    });

    console.log('\n📋 Components found in documentation:');
    components.forEach(component => console.log(`  - ${component}`));

    // Check for required components
    const missingComponents = REQUIRED_COMPONENTS.filter(
        comp => !components.includes(comp)
    );

    const success = missingComponents.length === 0;

    if (success) {
        console.log('\n✅ SUCCESS: All required components are present in the documentation!');
    } else {
        console.log('\n❌ ERROR: The following components are missing from the documentation:');
        missingComponents.forEach(comp => console.log(`  - ${comp}`));
    }

    // Check for duplicate components (warnings only)
    const duplicateComponents = components.filter((comp, index) =>
        components.indexOf(comp) !== index
    );

    if (duplicateComponents.length > 0) {
        console.log('\n⚠️  WARNING: Found duplicate components:');
        [...new Set(duplicateComponents)].forEach(comp => {
            const count = duplicateComponents.filter(c => c === comp).length + 1;
            console.log(`  - ${comp} (appears ${count} times)`);
        });
    } else {
        console.log('\n✅ No duplicate components found');
    }

    // Verify component details
    console.log('\n🔍 Verifying component details...');

    // Select a sample component to verify
    const componentToVerify = components.includes('fibonacci') ? 'fibonacci' : (components.includes('App') ? 'App' : components[0]);
    console.log(`Verifying details for component: ${componentToVerify}`);

    // Click on the component
    await page.evaluate((component) => {
        const componentLinks = Array.from(document.querySelectorAll('.component-link'));
        const targetLink = componentLinks.find(link => link.textContent.trim() === component);
        if (targetLink) targetLink.click();
    }, componentToVerify);

    // Wait for component details to load
    await page.waitForSelector('.component-details', { timeout: 5000 });

    // Verify that component details are displayed
    const detailsVisible = await page.evaluate(() => {
        const details = document.querySelector('.component-details');
        return details && details.textContent.length > 0;
    });

    if (detailsVisible) {
        console.log(`✅ Component details for ${componentToVerify} are displayed correctly`);
    } else {
        console.log(`❌ Failed to display details for ${componentToVerify}`);
    }

    await browser.close();

    return { success, missingComponents };
}

/**
 * Run the verification test
 */
async function runVerificationTest() {
    try {
        // Get port from command line arguments, or use default 8080
        const port = process.argv[2] || 8080;
        const url = `http://localhost:${port}`;

        const results = await verifyDocumentation(url);

        if (results.success) {
            console.log('\n🎉 Documentation verification test passed!');
            process.exit(0);
        } else {
            console.error('\n❌ Documentation verification test failed!');
            console.error('Missing components:', results.missingComponents.join(', '));
            process.exit(1);
        }
    } catch (error) {
        console.error('Error running verification test:', error);
        process.exit(1);
    }
}

// Run the test if called directly
if (require.main === module) {
    runVerificationTest();
}

module.exports = { verifyDocumentation, REQUIRED_COMPONENTS };
