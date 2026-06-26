const { chromium } = require('playwright');
const texas = require('./chrome-pilot/states/texas');

async function test() {
    console.log('Testing Texas scraper...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Testing with a common name
        const results = await texas.search(page, { lastName: 'Smith' });
        console.log('Results found:', results.length);
        if (results.length > 0) {
            console.log('Sample result:', JSON.stringify(results[0], null, 2));
        }
    } catch (err) {
        console.error('Error during test:', err);
    } finally {
        await browser.close();
    }
}

test();
