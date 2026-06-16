import test from 'node:test';
import assert from 'node:assert/strict';
import {getPrimaryAction} from './extension-actions.js';

test('opens popup for enabled extensions even when options or launch urls exist', () => {
	assert.deepEqual(
		getPrimaryAction({
			enabled: true,
			optionsUrl: 'chrome-extension://example/options.html',
			homepageUrl: 'https://example.com',
		}),
		{type: 'popup'},
	);
});

test('enables disabled extensions when allowed', () => {
	assert.deepEqual(getPrimaryAction({enabled: false, mayEnable: true}), {
		type: 'enable',
	});
});

test('marks disabled extensions unavailable when they cannot be enabled', () => {
	assert.deepEqual(getPrimaryAction({enabled: false, mayEnable: false}), {
		type: 'unavailable',
	});
});
