const { test, expect } = require('@playwright/test');

test.describe('Initial page load', () => {

    test('page title is correct', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle('Reaction Lab');
    });

    test('reaction dropdown is rendered', async ({ page }) => {
        await page.goto('/');
        const dropdown = page.locator("#reactionDropdown");
        await expect(dropdown).toBeVisible();
    });

    test('title screen is the only visible screen on load', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#titleScreen')).toBeVisible();
        await expect(page.locator('#preLabScreen')).toBeHidden();
        await expect(page.locator('#labScreen')).toBeHidden();
    });

    test('clicking pre-lab button navigates to pre-lab screen', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await expect(page.locator('#preLabScreen')).toBeVisible();
        await expect(page.locator('#titleScreen')).toBeHidden();
    });

    test('all four reactions are available', async ({ page }) => {
        await page.goto('/');
        const options = page.locator('#reactionDropdown option');
        await expect(options).toHaveCount(4);
    });

});

test.describe('Pre-Lab Screen', () => {
    test('switching reaction updates pre-lab briefing', async ({ page }) => {
        await page.goto('/');
        await page.selectOption('#reactionDropdown', 'hcl_naoh');
        await page.click('#titleToPreLabBtn');
        const hclText = await page.locator('#preLabBriefing').textContent();

        await page.click('#preLabToTitleBtn');
        await page.selectOption('#reactionDropdown', 'pb_no3_ki');
        await page.click('#titleToPreLabBtn');
        const pbText = await page.locator('#preLabBriefing').textContent();

        expect(hclText).not.toBe(pbText);
    });
});

test.describe('Prediction Screen', () => {
    test('prediction cards are rendered', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await page.click('#preLabToPredictionsBtn');
        const cards = page.locator('#predictionCards .card');
        await expect(cards).toHaveCount(6);
    });

    test('begin experiment button navigates to lab screen', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await page.click('#preLabToPredictionsBtn');
        await page.click('#predictionsToLabBtn');
        await expect(page.locator('#labScreen')).toBeVisible();
    });

    test('back button returns to pre-lab screen', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await page.click('#preLabToPredictionsBtn');
        await page.click('#predictionsToPreLabBtn');
        await expect(page.locator('#preLabScreen')).toBeVisible();
    });
});

test.describe('Lab Subscreen Access Order', () => {
    test('cannot access storage before completing safety', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await page.click('#preLabToPredictionsBtn');
        await page.click('#predictionsToLabBtn');

        await page.click('#toStorageScreenBtn');
        await expect(page.locator('#labScreen')).toBeVisible();
        await expect(page.locator('#labFeedback')).not.toBeEmpty();
    });

    test('cannot access measure before completing storage', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await page.click('#preLabToPredictionsBtn');
        await page.click('#predictionsToLabBtn');
        
        await page.click('#toMeasureScreenBtn');
        await expect(page.locator('#labScreen')).toBeVisible();
        await expect(page.locator('#labFeedback')).not.toBeEmpty();
    });

    test('cannot access react before completing measure', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await page.click('#preLabToPredictionsBtn');
        await page.click('#predictionsToLabBtn');
        
        await page.click('#toReactScreenBtn');
        await expect(page.locator('#labScreen')).toBeVisible();
        await expect(page.locator('#labFeedback')).not.toBeEmpty();
    });

    test('cannot access analyze before completing react', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await page.click('#preLabToPredictionsBtn');
        await page.click('#predictionsToLabBtn');
        
        await page.click('#toAnalyzeScreenBtn');
        await expect(page.locator('#labScreen')).toBeVisible();
        await expect(page.locator('#labFeedback')).not.toBeEmpty();
    });

    test('cannot access dispose before completing analyze', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await page.click('#preLabToPredictionsBtn');
        await page.click('#predictionsToLabBtn');
        
        await page.click('#toDisposeScreenBtn');
        await expect(page.locator('#labScreen')).toBeVisible();
        await expect(page.locator('#labFeedback')).not.toBeEmpty();
    });
});

test.describe('Safety screen', () => {

    test('safety screen is visible', async ({ page }) => {
        await page.goto('/');
        await page.click('#titleToPreLabBtn');
        await page.click('#preLabToPredictionsBtn');
        await page.click('#predictionsToLabBtn');
        await page.click('#toSafetyScreenBtn');
        await expect(page.locator('#safetyScreen')).toBeVisible();
    });
    
});