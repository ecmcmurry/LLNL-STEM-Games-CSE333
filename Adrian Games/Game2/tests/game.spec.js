const { test, expect } = require('@playwright/test');

// opens a real browser, loads the real game, interacts with it like a student would
test('home screen loads with all buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#home-screen')).toBeVisible();
    await expect(page.getByText('8 BIT CIRCUIT')).toBeVisible();
    await expect(page.getByRole('button', { name: 'FULL CIRCUIT' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'HOW TO PLAY' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'LEVELS' })).toBeVisible();
});

test('clicking HOW TO PLAY shows instructions and BACK returns home', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'HOW TO PLAY' }).click();
    await expect(page.locator('#howToPlay')).toBeVisible();
    await expect(page.locator('#home-screen')).not.toBeVisible();
    await page.getByRole('button', { name: 'BACK' }).click();
    await expect(page.locator('#home-screen')).toBeVisible();
});

test('starting full circuit loads play screen with timer and hearts', async ({ page }) => {
    await page.goto('/');
    await page.getByText('FULL CIRCUIT').click();
    await expect(page.locator('#play-screen')).toBeVisible();
    await expect(page.locator('#timer')).toBeVisible();
    await expect(page.locator('#hearts')).toBeVisible();
    await expect(page.locator('#goalText')).not.toBeEmpty();
});

test('clicking AI guide returns a real hint from Claude', async ({ page }) => {
    await page.goto('/');
    await page.getByText('FULL CIRCUIT').click();
    await expect(page.locator('#play-screen')).toBeVisible();

    //click the AI guide character
    await page.locator('.guideContainer').click();

    //wait for Claude to finish responding polls until text is no longer Thinking
    await page.waitForFunction(
        () => {
            const el = document.getElementById('hintText');
            return el && el.innerText.length > 0 && el.innerText !== 'Thinking...';
        },
        { timeout: 20000 }
    );
    const hint = await page.locator('#hintText').innerText();
    //hardcoded fallback hints are short formulas like "Ohm's Law: I = V / R"
    //a real Claude response is always a full sentence, so we check for 40+ chars
    expect(hint.length).toBeGreaterThan(40);
});
