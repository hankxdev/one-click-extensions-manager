import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	frameNativeMessage,
	getExtensionLaunchUrl,
	readNativeMessage,
	validateRequest,
} from './native-host.mjs';

const validExtensionId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function createProfile(preferences) {
	const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), 'ocem-profile-'));
	fs.writeFileSync(
		path.join(profilePath, 'Secure Preferences'),
		JSON.stringify(preferences),
	);
	return profilePath;
}

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

test('finds an extension action popup from stored browser preferences', () => {
	const profilePath = createProfile({
		extensions: {
			settings: {
				[validExtensionId]: {
					manifest: {
						action: {
							'default_popup': 'ui/popup/index.html?source=toolbar',
						},
					},
				},
			},
		},
	});

	assert.equal(
		getExtensionLaunchUrl(
			{
				type: 'open-extension-popup',
				extensionId: validExtensionId,
				extensionName: 'Dark Reader',
			},
			{browserProfilePath: profilePath},
		),
		`chrome-extension://${validExtensionId}/ui/popup/index.html?source=toolbar`,
	);
});

test('falls back to an extension options page when no popup is declared', () => {
	const profilePath = createProfile({
		extensions: {
			settings: {
				[validExtensionId]: {
					manifest: {
						'options_ui': {
							page: '/options.html',
						},
					},
				},
			},
		},
	});

	assert.equal(
		getExtensionLaunchUrl(
			{
				type: 'open-extension-popup',
				extensionId: validExtensionId,
				extensionName: 'Options Only',
			},
			{browserProfilePath: profilePath},
		),
		`chrome-extension://${validExtensionId}/options.html`,
	);
});

test('does not launch arbitrary external urls from stored manifests', () => {
	const profilePath = createProfile({
		extensions: {
			settings: {
				[validExtensionId]: {
					manifest: {
						action: {
							'default_popup': 'https://example.com/popup.html',
						},
					},
				},
			},
		},
	});

	assert.equal(
		getExtensionLaunchUrl(
			{
				type: 'open-extension-popup',
				extensionId: validExtensionId,
				extensionName: 'Unsafe',
			},
			{browserProfilePath: profilePath},
		),
		undefined,
	);
});
