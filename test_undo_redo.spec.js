// using playwright in the background to avoid messing with deps
const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const filePath = path.resolve(__dirname, 'index.html');
    await page.goto(`file://${filePath}`);

    // Add a node
    const routerItem = page.locator('.palette-item', { hasText: 'Router' });
    const canvasContainer = page.locator('#canvas-container');
    await routerItem.dragTo(canvasContainer, {
        targetPosition: { x: 100, y: 100 }
    });
    await page.waitForTimeout(100);

    let nodesCount = await page.locator('.node').count();
    console.log("Nodes initially:", nodesCount);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);

    nodesCount = await page.locator('.node').count();
    console.log("Nodes after Undo:", nodesCount);

    await page.keyboard.press('Control+y');
    await page.waitForTimeout(100);

    nodesCount = await page.locator('.node').count();
    console.log("Nodes after Redo:", nodesCount);

    await browser.close();
})();
