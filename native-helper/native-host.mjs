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
}

export function readNativeMessage(input = fs.readFileSync(0)) {
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

function sanitizeAutomationError(error) {
	return String(error)
		.replaceAll(configPath, '<config>')
		.replaceAll(helperDirectory, '<helper>')
		.trim();
}

function runAppleScript({browserApp, extensionName}) {
	const script = `
set targetName to ${appleScriptString(extensionName)}

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

tell application ${appleScriptString(browserApp)} to activate
delay 0.2
tell application "System Events"
	tell process ${appleScriptString(browserApp)}
		set frontmost to true
		if my clickToolbarItemInAnyWindow(targetName) then
			return "clicked pinned toolbar item"
		end if
		if my clickToolbarItemInAnyWindow("Extensions") then
			delay 0.4
			if my clickToolbarItemInAnyWindow(targetName) then
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

export function openExtensionPopup(request, config = readConfig()) {
	validateRequest(request);
	if (process.platform !== 'darwin') {
		throw new Error('The native popup helper currently supports macOS only.');
	}

	return runAppleScript({
		browserApp: config.browserApp || 'Brave Browser',
		extensionName: request.extensionName.trim(),
	});
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
