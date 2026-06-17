import test from 'node:test';
import assert from 'node:assert/strict';
import {
	browserProcessNamesFromConfig,
	buildWindowsAutomationScript,
	frameNativeMessage,
	readNativeMessage,
	validateRequest,
} from './native-host.mjs';

const validExtensionId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

test('rejects unsupported native helper request types', () => {
	assert.throws(
		() => validateRequest({type: 'unexpected'}),
		/Unsupported native helper request type/v,
	);
});

test('rejects invalid extension ids before reading config or automating UI', () => {
	assert.throws(
		() =>
			validateRequest({
				type: 'open-extension-popup',
				extensionId: '../bad',
				extensionName: 'Dark Reader',
			}),
		/Invalid extension id/v,
	);
});

test('rejects invalid extension aliases', () => {
	assert.throws(
		() =>
			validateRequest({
				type: 'open-extension-popup',
				extensionId: validExtensionId,
				extensionName: 'Dark Reader',
				extensionAliases: ['Dark Reader', 42],
			}),
		/Invalid extension aliases/v,
	);
});

test('rejects truncated native messages with a clear error', () => {
	const frame = frameNativeMessage({
		type: 'open-extension-popup',
		extensionId: validExtensionId,
		extensionName: 'Dark Reader',
	});

	assert.throws(
		() => readNativeMessage(frame.subarray(0, -2)),
		/Truncated native message body/v,
	);
});

test('normalizes configured Windows browser process names', () => {
	assert.deepEqual(
		browserProcessNamesFromConfig({
			browserProcessNames: ['brave.exe', 'BRAVE', 'chrome'],
		}),
		['brave', 'chrome'],
	);
	assert.deepEqual(
		browserProcessNamesFromConfig({browserApp: 'Google Chrome'}),
		['chrome'],
	);
	assert.deepEqual(
		browserProcessNamesFromConfig({browserDisplayName: 'Edge'}),
		['msedge'],
	);
});

test('escapes Windows automation script inputs', () => {
	const script = buildWindowsAutomationScript({
		browserProcessNames: ['brave'],
		extensionNames: ["Owner's Extension"],
	});

	assert.match(script, /'Owner''s Extension'/v);
	assert.match(script, /Find-BrowserProcess/v);
});
