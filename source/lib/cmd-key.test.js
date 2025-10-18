import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

async function loadModuleWithPlatform(platform) {
	// Stub global navigator.platform before importing the module.
	Object.defineProperty(navigator, 'platform', {value: platform, configurable: true});
	// Dynamic import with a cache-busting query so module-level detection is re-evaluated.
	const url = new URL(`./cmd-key.js?cb=${Date.now()}`, import.meta.url);
	return import(url.href);
}

describe('replaceModifierIfMac', () => {
	it('non-Mac: returns original string unchanged', async () => {
		const mod = await loadModuleWithPlatform('Win32');
		const input = '<kbd>Ctrl+Z</kbd>';
		assert.strictEqual(mod.replaceModifierIfMac(input, 'z'), input);
	});

	it('Mac: replaces "<kbd>Ctrl+Z</kbd>" with "⌘Z"', async () => {
		const mod = await loadModuleWithPlatform('MacIntel');
		assert.strictEqual(
			mod.replaceModifierIfMac('<kbd>Ctrl+Z</kbd>', 'z'),
			'<kbd>⌘Z</kbd>',
		);
	});

	it('Mac: replacement is case-insensitive ("ctrl+z" -> "⌘Z")', async () => {
		const mod = await loadModuleWithPlatform('Macintosh');
		assert.strictEqual(
			mod.replaceModifierIfMac('<kbd>ctrl+z</kbd>', 'z'),
			'<kbd>⌘Z</kbd>',
		);
	});

	it('Mac: only replaces when preceded by ">" (plain "Ctrl+Z" unchanged)', async () => {
		const mod = await loadModuleWithPlatform('MacIntel');
		const plain = 'Ctrl+Z';
		assert.strictEqual(mod.replaceModifierIfMac(plain, 'z'), plain);
	});

	it('Mac: only first occurrence is replaced when multiple matches exist', async () => {
		const mod = await loadModuleWithPlatform('MacIntel');
		const input = '<kbd>Ctrl+Z</kbd> <kbd>Ctrl+Z</kbd>';
		const expected = '<kbd>⌘Z</kbd> <kbd>Ctrl+Z</kbd>';
		assert.strictEqual(mod.replaceModifierIfMac(input, 'z'), expected);
	});
});
