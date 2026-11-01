import { expect, test } from '@playwright/test';

import { mockGateway, populatedConfig } from '../fixtures';

for (const hash of ['#edit=%', '#edit=%GG', '#edit=%E0%A4%A']) {
	test(`Models page stays usable with malformed fragment ${hash}`, async ({ page }) => {
		const gateway = await mockGateway(page, populatedConfig());
		const pageErrors: string[] = [];
		page.on('pageerror', error => pageErrors.push(error.message));

		await page.goto(`/llm/models${hash}`);

		await expect(page.getByRole('heading', { name: 'LLM Models', exact: true })).toBeVisible();
		await expect(page.getByLabel('Incoming model match')).toHaveCount(0);
		await page.getByRole('button', { name: 'Add model' }).first().click();
		await expect(page.getByLabel('Incoming model match')).toBeVisible();
		expect(gateway.postedConfigs).toHaveLength(0);
		expect(pageErrors).toEqual([]);
	});
}

test('Models page recovers after a malformed hash change and history navigation', async ({
	page
}) => {
	const gateway = await mockGateway(page, populatedConfig());
	const pageErrors: string[] = [];
	page.on('pageerror', error => pageErrors.push(error.message));

	await page.goto('/llm/models#edit=fast');
	await expect(page.getByLabel('Incoming model match')).toHaveValue('fast');

	await page.evaluate(
		() =>
			new Promise<void>(resolve => {
				window.addEventListener('hashchange', () => resolve(), { once: true });
				window.location.hash = '#edit=%';
			})
	);
	await expect(page.getByRole('heading', { name: 'LLM Models', exact: true })).toBeVisible();
	await expect(page.getByLabel('Incoming model match')).toHaveCount(0);

	await page.getByRole('button', { name: 'Add model' }).first().click();
	await expect(page).toHaveURL(/#add=model$/);
	await expect(page.getByLabel('Incoming model match')).toBeVisible();

	await page.goBack();
	await expect(page).toHaveURL(/#edit=%$/);
	await expect(page.getByLabel('Incoming model match')).toHaveCount(0);
	await page.goForward();
	await expect(page).toHaveURL(/#add=model$/);
	await expect(page.getByLabel('Incoming model match')).toBeVisible();

	await page.getByRole('button', { name: 'Close' }).click();
	await expect(page.getByLabel('Incoming model match')).toHaveCount(0);
	expect(gateway.postedConfigs).toHaveLength(0);
	expect(pageErrors).toEqual([]);
});

test('Models page remains usable with a malformed fragment at mobile width', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	const gateway = await mockGateway(page, populatedConfig());
	const pageErrors: string[] = [];
	page.on('pageerror', error => pageErrors.push(error.message));

	await page.goto('/llm/models#edit=%');
	await expect(page.getByRole('heading', { name: 'LLM Models', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Add model' }).first().click();
	await expect(page.getByLabel('Incoming model match')).toBeVisible();
	expect(gateway.postedConfigs).toHaveLength(0);
	expect(pageErrors).toEqual([]);
});

for (const { hash, modelName } of [
	{ hash: '#edit=fast', modelName: 'fast' },
	{ hash: '#edit=openai%2F*', modelName: 'openai/*' },
	{ hash: '#policies=fast', modelName: 'fast' },
	{ hash: '#model=fast', modelName: 'fast' },
	{ hash: '#modelPolicy=fast', modelName: 'fast' }
]) {
	test(`Models page opens ${modelName} from ${hash}`, async ({ page }) => {
		const gateway = await mockGateway(page, populatedConfig());

		await page.goto(`/llm/models${hash}`);

		await expect(page.getByLabel('Incoming model match')).toHaveValue(modelName);
		expect(gateway.postedConfigs).toHaveLength(0);
	});
}

test('Models page decodes encoded model IDs once', async ({ page }) => {
	const modelName = 'lab/%2F模型';
	const config = populatedConfig();
	(config.llm as { models: Array<Record<string, unknown>> }).models.push({
		name: modelName,
		provider: { reference: 'openai-shared' },
		params: { model: 'gpt-5.4-nano' }
	});
	const gateway = await mockGateway(page, config);

	await page.goto(`/llm/models#edit=${encodeURIComponent(modelName)}`);

	await expect(page.getByLabel('Incoming model match')).toHaveValue(modelName);
	expect(gateway.postedConfigs).toHaveLength(0);
});

test('Models page leaves empty and unknown fragments closed', async ({ page }) => {
	const gateway = await mockGateway(page, populatedConfig());

	await page.goto('/llm/models');
	await expect(page.getByLabel('Incoming model match')).toHaveCount(0);
	await page.goto('/llm/models#unknown');
	await expect(page.getByRole('heading', { name: 'LLM Models', exact: true })).toBeVisible();
	await expect(page.getByLabel('Incoming model match')).toHaveCount(0);
	expect(gateway.postedConfigs).toHaveLength(0);
});

test('Models page opens a virtual model from its URL fragment', async ({ page }) => {
	const gateway = await mockGateway(page, populatedConfig());

	await page.goto('/llm/models#add=virtual');

	await expect(page.getByRole('dialog', { name: 'Add virtual model' })).toBeVisible();
	expect(gateway.postedConfigs).toHaveLength(0);
});
