const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to https://www.bursalimbah.com...');
    await page.goto('https://www.bursalimbah.com', { waitUntil: 'networkidle', timeout: 60000 });

    // Debug: print page title and some text to see where we are
    const title = await page.title();
    console.log(`Page Title: ${title}`);

    // 1. UI Mobile View Checks
    console.log('--- UI Mobile View Checks ---');
    
    // Detailed PreLoved search
    const content = await page.content();
    const preLovedRegex = /preloved/gi;
    const matches = content.match(preLovedRegex);
    console.log(`PreLoved occurrences: ${matches ? matches.length : 0}`);

    const chatBtn = page.locator('#chat-floating-btn');
    const bottomNav = page.locator('#mobile-app-bottom-nav');
    
    if (await chatBtn.isVisible()) {
      const chatBox = await chatBtn.boundingBox();
      const navBox = await bottomNav.boundingBox();
      if (chatBox && navBox) {
        console.log(`Chat bubble bottom: ${chatBox.y + chatBox.height}, Nav top: ${navBox.y}`);
        if (chatBox.y + chatBox.height <= navBox.y + 10) {
          console.log('Chat bubble is correctly positioned above bottom nav.');
        } else {
          console.log('Chat bubble may be obscured by bottom nav.');
        }
      }
    } else {
      console.log('Chat floating button (#chat-floating-btn) not found.');
    }

    // 2. Serverless Functionality
    console.log('--- Serverless Functionality Checks ---');
    
    // Try to find anything that looks like a product or market rate
    const bodyText = await page.innerText('body');
    console.log(`Body text length: ${bodyText.length}`);
    
    const hasPrice = /Price|Rp|USD|EUR/i.test(bodyText);
    console.log(`Price/Currency found in text: ${hasPrice}`);

    const tickerCheck = await page.locator('.ticker, .rate, .currency, #market').first().isVisible();
    console.log(`Ticker element visible: ${tickerCheck}`);

    await page.screenshot({ path: 'debug_mobile_view.png', fullPage: true });
    console.log('Screenshot saved to debug_mobile_view.png');

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
})();
