#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {Buffer} from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const helperDirectory = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(helperDirectory, 'native-host-config.json');
const requestType = 'open-extension-popup';

export function validateRequest(request) {
	if (request?.type !== requestType) {
		throw new Error('Unsupported native helper request type.');
	}

	if (!/^[a-p]{32}$/v.test(request.extensionId || '')) {
		throw new Error('Invalid extension id.');
	}

	if (
		typeof request.extensionName !== 'string' ||
		request.extensionName.trim() === ''
	) {
		throw new Error('Invalid extension name.');
	}

	if (
		request.extensionAliases !== undefined &&
		(!Array.isArray(request.extensionAliases) ||
			request.extensionAliases.some(alias => typeof alias !== 'string'))
	) {
		throw new Error('Invalid extension aliases.');
	}
}

function sleepSync(milliseconds) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function readExactBytes(fileDescriptor, length) {
	const buffer = Buffer.alloc(length);
	let offset = 0;
	const deadline = Date.now() + 5000;

	while (offset < length) {
		try {
			const bytesRead = fs.readSync(
				fileDescriptor,
				buffer,
				offset,
				length - offset,
				null,
			);
			if (bytesRead === 0) {
				break;
			}

			offset += bytesRead;
		} catch (error) {
			if (error.code !== 'EAGAIN' || Date.now() > deadline) {
				throw error;
			}

			sleepSync(10);
		}
	}

	return buffer.subarray(0, offset);
}

function readNativeMessageFromStdin() {
	const header = readExactBytes(0, 4);
	if (header.length < 4) {
		throw new Error('Truncated native message header.');
	}

	const length = header.readUInt32LE(0);
	const body = readExactBytes(0, length);
	if (body.length < length) {
		throw new Error('Truncated native message body.');
	}

	return JSON.parse(body.toString('utf8'));
}

export function readNativeMessage(input) {
	if (input === undefined) {
		return readNativeMessageFromStdin();
	}

	if (input.length < 4) {
		throw new Error('Truncated native message header.');
	}

	const length = input.readUInt32LE(0);
	const end = 4 + length;
	if (input.length < end) {
		throw new Error('Truncated native message body.');
	}

	return JSON.parse(input.subarray(4, end).toString('utf8'));
}

export function frameNativeMessage(message) {
	const body = Buffer.from(JSON.stringify(message));
	const header = Buffer.alloc(4);
	header.writeUInt32LE(body.length, 0);
	return Buffer.concat([header, body]);
}

function readConfig() {
	return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function appleScriptString(value) {
	return JSON.stringify(value);
}

function appleScriptList(values) {
	return `{${values.map(value => appleScriptString(value)).join(', ')}}`;
}

function sanitizeAutomationError(error) {
	return String(error)
		.replaceAll(configPath, '<config>')
		.replaceAll(helperDirectory, '<helper>')
		.trim();
}

function defaultBrowserProfilePath(browserApp) {
	if (!process.env.HOME) {
		return undefined;
	}

	if (browserApp === 'Google Chrome') {
		return path.join(
			process.env.HOME,
			'Library/Application Support/Google/Chrome/Default',
		);
	}

	if (browserApp === 'Chromium') {
		return path.join(
			process.env.HOME,
			'Library/Application Support/Chromium/Default',
		);
	}

	return path.join(
		process.env.HOME,
		'Library/Application Support/BraveSoftware/Brave-Browser/Default',
	);
}

function extensionPreferencePaths(config) {
	const profilePath =
		config.browserProfilePath || defaultBrowserProfilePath(config.browserApp);
	if (!profilePath) {
		return [];
	}

	return [
		path.join(profilePath, 'Secure Preferences'),
		path.join(profilePath, 'Preferences'),
	];
}

function readStoredExtensionManifest(extensionId, config) {
	for (const preferencesPath of extensionPreferencePaths(config)) {
		try {
			const preferences = JSON.parse(
				fs.readFileSync(preferencesPath, 'utf8'),
			);
			const manifest =
				preferences.extensions?.settings?.[extensionId]?.manifest;
			if (manifest && typeof manifest === 'object') {
				return manifest;
			}
		} catch (error) {
			if (error.code !== 'ENOENT') {
				continue;
			}
		}
	}

	return undefined;
}

function isAsciiLetter(codePoint) {
	return (
		(codePoint >= 65 && codePoint <= 90) ||
		(codePoint >= 97 && codePoint <= 122)
	);
}

function isUrlSchemeCharacter(codePoint) {
	return (
		isAsciiLetter(codePoint) ||
		(codePoint >= 48 && codePoint <= 57) ||
		codePoint === 43 ||
		codePoint === 45 ||
		codePoint === 46
	);
}

function hasControlCharacter(value) {
	for (const character of value) {
		const codePoint = character.codePointAt(0);
		if (codePoint <= 0x1F || codePoint === 0x7F) {
			return true;
		}
	}

	return false;
}

function hasUrlScheme(value) {
	const colonIndex = value.indexOf(':');
	if (colonIndex < 1 || !isAsciiLetter(value.codePointAt(0))) {
		return false;
	}

	for (let index = 1; index < colonIndex; index += 1) {
		if (!isUrlSchemeCharacter(value.codePointAt(index))) {
			return false;
		}
	}

	return true;
}

function normalizeExtensionPageUrl(extensionId, pagePath) {
	if (typeof pagePath !== 'string') {
		return undefined;
	}

	const trimmedPath = pagePath.trim();
	if (!trimmedPath || hasControlCharacter(trimmedPath)) {
		return undefined;
	}

	const extensionOrigin = `chrome-extension://${extensionId}/`;
	if (trimmedPath.startsWith(extensionOrigin)) {
		return trimmedPath;
	}

	if (hasUrlScheme(trimmedPath)) {
		return undefined;
	}

	return `${extensionOrigin}${trimmedPath.replace(/^\/+/v, '')}`;
}

function extensionPageCandidates(manifest) {
	const actions = [
		manifest.action,
		manifest.browser_action,
		manifest.page_action,
	];
	const candidates = actions
		.map(action => action?.default_popup)
		.filter(Boolean);

	if (manifest.options_ui?.page) {
		candidates.push(manifest.options_ui.page);
	}

	if (manifest.options_page) {
		candidates.push(manifest.options_page);
	}

	return candidates;
}

export function getExtensionLaunchUrl(request, config = readConfig()) {
	validateRequest(request);
	const manifest = readStoredExtensionManifest(request.extensionId, config);
	if (!manifest) {
		return undefined;
	}

	for (const pagePath of extensionPageCandidates(manifest)) {
		const launchUrl = normalizeExtensionPageUrl(
			request.extensionId,
			pagePath,
		);
		if (launchUrl) {
			return launchUrl;
		}
	}

	return undefined;
}

function uniqueNames(names) {
	const seen = new Set();
	return names
		.map(name => name.trim())
		.filter(name => {
			const key = name.toLowerCase();
			if (!name || seen.has(key)) {
				return false;
			}

			seen.add(key);
			return true;
		});
}

function runAppleScript({browserApp, extensionNames}) {
	const script = `
set targetNames to ${appleScriptList(extensionNames)}

on pressElement(rootElement)
	tell application "System Events"
		try
			set itemPosition to position of rootElement
			set itemSize to size of rootElement
			click at {((item 1 of itemPosition) + ((item 1 of itemSize) / 2)), ((item 2 of itemPosition) + ((item 2 of itemSize) / 2))}
			return true
		end try
		try
			click rootElement
			return true
		end try
		try
			perform action "AXPress" of rootElement
			return true
		end try
	end tell
	return false
end pressElement

on clickToolbarItemByDescription(rootElement, depth, wantedText, insideToolbar)
	if depth > 12 then return false
	set wantedString to wantedText as text
	tell application "System Events"
		set roleText to ""
		try
			set roleText to role of rootElement as text
		end try
		set nowInsideToolbar to insideToolbar
		if roleText is "AXToolbar" then set nowInsideToolbar to true
		try
			set descriptionText to description of rootElement as text
		on error
			set descriptionText to ""
		end try
		if nowInsideToolbar then
			ignoring case
				if descriptionText contains wantedString then
					if my pressElement(rootElement) then return true
				end if
			end ignoring
		end if
		try
			repeat with child in UI elements of rootElement
				if my clickToolbarItemByDescription(child, depth + 1, wantedString, nowInsideToolbar) then return true
			end repeat
		end try
	end tell
	return false
end clickToolbarItemByDescription

on elementText(rootElement)
	tell application "System Events"
		set parts to {}
		try
			set end of parts to description of rootElement as text
		end try
		try
			set end of parts to name of rootElement as text
		end try
		try
			set end of parts to value of rootElement as text
		end try
		return parts as text
	end tell
end elementText

on clickMenuItemByText(rootElement, depth, wantedText)
	if depth > 12 then return false
	set wantedString to wantedText as text
	tell application "System Events"
		set combinedText to my elementText(rootElement)
		ignoring case
			if combinedText contains wantedString then
				if my pressElement(rootElement) then return true
			end if
		end ignoring
		try
			repeat with child in UI elements of rootElement
				if my clickMenuItemByText(child, depth + 1, wantedString) then return true
			end repeat
		end try
	end tell
	return false
end clickMenuItemByText

on clickToolbarItemInAnyWindow(wantedText)
	tell application "System Events"
		tell process ${appleScriptString(browserApp)}
			repeat with browserWindow in windows
				if my clickToolbarItemByDescription(browserWindow, 0, wantedText, false) then return true
			end repeat
		end tell
	end tell
	return false
end clickToolbarItemInAnyWindow

on clickMenuItemInAnyWindow(wantedText)
	tell application "System Events"
		tell process ${appleScriptString(browserApp)}
			repeat with browserWindow in windows
				set subroleText to ""
				try
					set subroleText to subrole of browserWindow as text
				end try
				if subroleText is not "AXStandardWindow" then
					if my clickMenuItemByText(browserWindow, 0, wantedText) then return true
				end if
			end repeat
		end tell
	end tell
	return false
end clickMenuItemInAnyWindow

on clickAnyToolbarAlias(namesToTry)
	repeat with candidateName in namesToTry
		if my clickToolbarItemInAnyWindow(candidateName as text) then return true
	end repeat
	return false
end clickAnyToolbarAlias

on clickAnyMenuAlias(namesToTry)
	repeat with candidateName in namesToTry
		if my clickMenuItemInAnyWindow(candidateName as text) then return true
	end repeat
	return false
end clickAnyMenuAlias

tell application ${appleScriptString(browserApp)} to activate
delay 0.2
tell application "System Events"
	tell process ${appleScriptString(browserApp)}
		set frontmost to true
		if my clickAnyToolbarAlias(targetNames) then
			return "clicked pinned toolbar item"
		end if
		if my clickToolbarItemInAnyWindow("Extensions") then
			delay 0.4
			if my clickAnyMenuAlias(targetNames) then
				return "clicked extensions menu item"
			end if
		end if
	end tell
end tell

error "Could not find the extension in the browser toolbar or Extensions menu."
`;
	const result = spawnSync('/usr/bin/osascript', ['-e', script], {
		encoding: 'utf8',
		timeout: 8000,
	});

	if (result.status !== 0) {
		throw new Error(
			sanitizeAutomationError(
				result.stderr || result.stdout || 'AppleScript failed.',
			),
		);
	}

	return result.stdout.trim() || 'clicked extension popup';
}

function openExtensionPageWindow({browserApp, launchUrl}) {
	const script = `
tell application ${appleScriptString(browserApp)}
	activate
	set popupWindow to make new window
	set URL of active tab of popupWindow to ${appleScriptString(launchUrl)}
	set bounds of popupWindow to {900, 120, 1320, 780}
	return "opened extension popup page in window"
end tell
`;
	const result = spawnSync('/usr/bin/osascript', ['-e', script], {
		encoding: 'utf8',
		timeout: 8000,
	});

	if (result.status !== 0) {
		throw new Error(
			sanitizeAutomationError(
				result.stderr || result.stdout || 'AppleScript failed.',
			),
		);
	}

	return result.stdout.trim() || 'opened extension popup page in window';
}

export function openExtensionPopup(request, config = readConfig()) {
	validateRequest(request);
	if (process.platform !== 'darwin') {
		throw new Error('The native popup helper currently supports macOS only.');
	}

	const browserApp = config.browserApp || 'Brave Browser';
	try {
		return runAppleScript({
			browserApp,
			extensionNames: uniqueNames([
				request.extensionName,
				...(request.extensionAliases || []),
			]),
		});
	} catch (clickError) {
		const launchUrl = getExtensionLaunchUrl(request, {
			...config,
			browserApp,
		});
		if (!launchUrl) {
			throw clickError;
		}

		try {
			return openExtensionPageWindow({browserApp, launchUrl});
		} catch (fallbackError) {
			throw new Error(
				`${clickError.message} Popup-window fallback also failed: ${
					fallbackError.message || fallbackError
				}`,
				{cause: fallbackError},
			);
		}
	}
}

function main() {
	try {
		const request = readNativeMessage();
		const detail = openExtensionPopup(request);
		process.stdout.write(frameNativeMessage({ok: true, detail}));
	} catch (error) {
		process.stdout.write(
			frameNativeMessage({
				ok: false,
				error: error.message || 'Native helper failed.',
			}),
		);
	}
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	main();
}
