import assert from 'node:assert';
import test from 'node:test';
import pickBestIcon from './icons.js';

const manifest = [
	{url: '16.svg', size: 16},
	{url: '32.svg', size: 32},
];

test('pickBestIcon', () => {
	globalThis.devicePixelRatio = 1;
	assert.equal(pickBestIcon(), 'icons/puzzle.svg');
	assert.equal(pickBestIcon(undefined), 'icons/puzzle.svg');
	assert.equal(pickBestIcon([]), 'icons/puzzle.svg');
	assert.equal(pickBestIcon(manifest), '16.svg');
	assert.equal(pickBestIcon(manifest, 16), '16.svg');
	assert.equal(pickBestIcon(manifest, 1), '16.svg');
	assert.equal(pickBestIcon(manifest, 32), '32.svg');
	assert.equal(pickBestIcon(manifest, 48), '32.svg');

	globalThis.devicePixelRatio = 2;
	assert.equal(pickBestIcon(manifest, 16), '32.svg');
	assert.equal(pickBestIcon(manifest, 32), '32.svg');
});
