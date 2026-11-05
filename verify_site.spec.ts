import { test, expect } from '@playwright/test';

test('Verify UI Mobile View and Serverless Functionality', async ({ page }) => {
  // Set viewport to mobile
  await page.setViewportSize({ width: 375, height: 812 });
  
  await page.goto('https://www.bursalimbah.com');

  // 1. UI Mobile View Checks
  
  // Confirm "PreLoved" is gone from story highlights and filter chips
  const content = await page.content();
  expect(content).not.toContain('PreLoved');
  
  // Confirm chat bubble position
  const chatBtn = page.locator('#chat-floating-btn');
  const bottomNav = page.locator('#mobile-app-bottom-nav');
  
  if (await chatBtn.isVisible()) {
    const chatBox = await chatBtn.boundingBox();
    const navBox = await bottomNav.boundingBox();
    
    if (chatBox && navBox) {
      // Chat bubble should be above the bottom nav
      expect(chatBox.y + chatBox.height).toBeLessThanOrEqual(navBox.y + 10);
    }
  }

  // 2. Serverless Functionality
  
  // Verify public product listings load (Supabase check)
  // Assuming there's a product grid or list
  const productItems = page.locator('.product-item, [data-testid="product-card"]');
  await expect(productItems.first()).toBeVisible({ timeout: 15000 });
  
  // Verify live currency ticker (External API check)
  const ticker = page.locator('.currency-ticker, #market-rates');
  await expect(ticker).not.toBeEmpty();
  
  // Take screenshots for verification
  await page.screenshot({ path: 'mobile_view.png', fullPage: true });
});
