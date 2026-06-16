import test from 'node:test';
import assert from 'node:assert/strict';
import {
	openNativePopup,
	PopupHelperError,
	nativeHostName,
} from './native-popup.js';

function installChromeMock({nativeMessaging, runtimeMessaging}) {
	globalThis.chrome = {
		runtime: {
			id: 'manager-extension-id',
			lastError: undefined,
			sendNativeMessage(hostName, payload, callback) {
				nativeMessaging({hostName, payload, callback});
			},
			sendMessage(...arguments_) {
				runtimeMessaging({arguments_, callback: arguments_.at(-1)});
			},
		},
	};
}

test('uses direct native messaging when it succeeds', async () => {
	installChromeMock({
		nativeMessaging({hostName, payload, callback}) {
			assert.equal(hostName, nativeHostName);
			assert.equal(payload.type, 'open-extension-popup');
			callback({ok: true, detail: 'native'});
		},
		runtimeMessaging() {
			assert.fail('runtime messaging should not run after native success');
		},
	});

	assert.deepEqual(
		await openNativePopup({
			extensionId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			extensionName: 'Example',
			extensionAliases: ['Example Full Name'],
		}),
		{ok: true, detail: 'native'},
	);
});

test('falls back to the local helper when native transports fail', async () => {
	const calls = [];
	installChromeMock({
		nativeMessaging({callback}) {
			chrome.runtime.lastError = {message: 'native missing'};
			callback();
			chrome.runtime.lastError = undefined;
		},
		runtimeMessaging({callback}) {
			chrome.runtime.lastError = {message: 'background unavailable'};
			callback();
			chrome.runtime.lastError = undefined;
		},
	});
	globalThis.fetch = async (url, options) => {
		calls.push({url, body: JSON.parse(options.body)});
		return {
			ok: true,
			json: async () => ({ok: true, detail: 'local'}),
		};
	};

	assert.deepEqual(
		await openNativePopup({
			extensionId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
			extensionName: 'Fallback',
			extensionAliases: ['Fallback Long Name'],
		}),
		{ok: true, detail: 'local'},
	);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].body.extensionName, 'Fallback');
	assert.deepEqual(calls[0].body.extensionAliases, ['Fallback Long Name']);
});

test('reports structured failures when every transport fails', async () => {
	installChromeMock({
		nativeMessaging({callback}) {
			chrome.runtime.lastError = {message: 'native missing'};
			callback();
			chrome.runtime.lastError = undefined;
		},
		runtimeMessaging({callback}) {
			chrome.runtime.lastError = {message: 'background unavailable'};
			callback();
			chrome.runtime.lastError = undefined;
		},
	});
	globalThis.fetch = async () => ({
		ok: false,
		status: 500,
		json: async () => ({error: 'local failed'}),
	});

	await assert.rejects(
		openNativePopup({
			extensionId: 'cccccccccccccccccccccccccccccccc',
			extensionName: 'Broken',
		}),
		error => {
			assert.ok(error instanceof PopupHelperError);
			assert.equal(error.details.length, 4);
			assert.match(error.details.join('\n'), /native missing/v);
			assert.match(error.details.join('\n'), /local failed/v);
			return true;
		},
	);
});
