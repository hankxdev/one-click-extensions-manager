import test from 'node:test';
import assert from 'node:assert/strict';
import {
	frameNativeMessage,
	readNativeMessage,
	validateRequest,
} from './native-host.mjs';

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

test('rejects truncated native messages with a clear error', () => {
	const frame = frameNativeMessage({
		type: 'open-extension-popup',
		extensionId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
		extensionName: 'Dark Reader',
	});

	assert.throws(
		() => readNativeMessage(frame.subarray(0, -2)),
		/Truncated native message body/v,
	);
});
