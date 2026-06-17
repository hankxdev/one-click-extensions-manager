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

function powerShellString(value) {
	return `'${String(value).replaceAll("'", "''")}'`;
}

function powerShellList(values) {
	return `@(${values.map(value => powerShellString(value)).join(', ')})`;
}

function sanitizeAutomationError(error) {
	return String(error)
		.replaceAll(configPath, '<config>')
		.replaceAll(helperDirectory, '<helper>')
		.trim();
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

function runNativeClicker({browserApp, extensionNames}) {
	const clickerPath = path.join(helperDirectory, 'native-clicker');
	if (!fs.existsSync(clickerPath)) {
		throw new Error('Native clicker is not installed.');
	}

	const result = spawnSync(
		clickerPath,
		[browserApp, JSON.stringify(extensionNames)],
		{
			encoding: 'utf8',
			timeout: 8000,
		},
	);

	if (result.status !== 0) {
		throw new Error(
			sanitizeAutomationError(
				result.stderr || result.stdout || 'Native clicker failed.',
			),
		);
	}

	return result.stdout.trim() || 'clicked extension popup';
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

export function browserProcessNamesFromConfig(config = {}) {
	if (Array.isArray(config.browserProcessNames)) {
		const configuredNames = uniqueNames(
			config.browserProcessNames
				.filter(name => typeof name === 'string')
				.map(name => name.replace(/\.exe$/iv, '')),
		);
		if (configuredNames.length > 0) {
			return configuredNames;
		}
	}

	const browserName = String(
		config.browser || config.browserApp || config.browserDisplayName || '',
	).toLowerCase();

	if (browserName.includes('chrome')) {
		return ['chrome'];
	}

	if (browserName.includes('edge')) {
		return ['msedge'];
	}

	if (browserName.includes('chromium')) {
		return ['chromium'];
	}

	return ['brave'];
}

function windowsPowerShellPath() {
	if (!process.env.SystemRoot) {
		return 'powershell.exe';
	}

	return path.join(
		process.env.SystemRoot,
		'System32',
		'WindowsPowerShell',
		'v1.0',
		'powershell.exe',
	);
}

export function buildWindowsAutomationScript({
	browserProcessNames,
	extensionNames,
}) {
	return `
$ErrorActionPreference = 'Stop'
$targetNames = ${powerShellList(extensionNames)}
$browserProcessNames = ${powerShellList(browserProcessNames)}

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class OnFireNativeWindow {
	[DllImport("user32.dll")]
	public static extern bool SetForegroundWindow(IntPtr hWnd);

	[DllImport("user32.dll")]
	public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

	[DllImport("user32.dll")]
	public static extern bool SetCursorPos(int x, int y);

	[DllImport("user32.dll")]
	public static extern void mouse_event(int flags, int dx, int dy, int data, UIntPtr extraInfo);
}
'@

function Find-BrowserProcess {
	foreach ($processName in $browserProcessNames) {
		$processes = Get-Process -Name $processName -ErrorAction SilentlyContinue |
			Where-Object { $_.MainWindowHandle -ne 0 } |
			Sort-Object StartTime -Descending
		if ($processes) {
			return $processes[0]
		}
	}

	return $null
}

function Test-NameMatch($value, $names) {
	if ([string]::IsNullOrWhiteSpace($value)) {
		return $false
	}

	foreach ($name in $names) {
		if ($value.IndexOf($name, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
			return $true
		}
	}

	return $false
}

function Invoke-OnFireElement($element) {
	try {
		$invokePattern = $element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
		if ($invokePattern) {
			$invokePattern.Invoke()
			return $true
		}
	} catch {}

	try {
		$expandPattern = $element.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern)
		if ($expandPattern) {
			$expandPattern.Expand()
			return $true
		}
	} catch {}

	try {
		$rectangle = $element.Current.BoundingRectangle
		if (-not $rectangle.IsEmpty) {
			$x = [int]($rectangle.Left + ($rectangle.Width / 2))
			$y = [int]($rectangle.Top + ($rectangle.Height / 2))
			[OnFireNativeWindow]::SetCursorPos($x, $y) | Out-Null
			[OnFireNativeWindow]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
			[OnFireNativeWindow]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
			return $true
		}
	} catch {}

	return $false
}

function Find-MatchingElement($roots, $names, $maxDepth) {
	$queue = New-Object System.Collections.Queue
	foreach ($root in $roots) {
		if ($root) {
			$queue.Enqueue([pscustomobject]@{ Element = $root; Depth = 0 })
		}
	}

	while ($queue.Count -gt 0) {
		$item = $queue.Dequeue()
		$element = $item.Element
		$depth = $item.Depth
		try {
			if (Test-NameMatch $element.Current.Name $names) {
				return $element
			}
		} catch {}

		if ($depth -ge $maxDepth) {
			continue
		}

		try {
			$children = $element.FindAll(
				[System.Windows.Automation.TreeScope]::Children,
				[System.Windows.Automation.Condition]::TrueCondition
			)
			foreach ($child in $children) {
				$queue.Enqueue([pscustomobject]@{ Element = $child; Depth = $depth + 1 })
			}
		} catch {}
	}

	return $null
}

function Find-ToolbarRoots($root) {
	$toolbars = New-Object System.Collections.ArrayList
	$queue = New-Object System.Collections.Queue
	$queue.Enqueue([pscustomobject]@{ Element = $root; Depth = 0 })
	while ($queue.Count -gt 0) {
		$item = $queue.Dequeue()
		$element = $item.Element
		$depth = $item.Depth
		try {
			if ($element.Current.ControlType -eq [System.Windows.Automation.ControlType]::ToolBar) {
				[void]$toolbars.Add($element)
			}
		} catch {}

		if ($depth -ge 8) {
			continue
		}

		try {
			$children = $element.FindAll(
				[System.Windows.Automation.TreeScope]::Children,
				[System.Windows.Automation.Condition]::TrueCondition
			)
			foreach ($child in $children) {
				$queue.Enqueue([pscustomobject]@{ Element = $child; Depth = $depth + 1 })
			}
		} catch {}
	}

	return $toolbars
}

function Get-PopupRoots($browserHandle) {
	$roots = New-Object System.Collections.ArrayList
	$desktop = [System.Windows.Automation.AutomationElement]::RootElement
	$children = $desktop.FindAll(
		[System.Windows.Automation.TreeScope]::Children,
		[System.Windows.Automation.Condition]::TrueCondition
	)
	foreach ($child in $children) {
		try {
			if ($child.Current.NativeWindowHandle -ne $browserHandle) {
				[void]$roots.Add($child)
			}
		} catch {}
	}

	return $roots
}

$browserProcess = Find-BrowserProcess
if (-not $browserProcess) {
	throw 'Could not find a running supported browser window.'
}

$browserHandle = $browserProcess.MainWindowHandle
[OnFireNativeWindow]::ShowWindowAsync($browserHandle, 9) | Out-Null
[OnFireNativeWindow]::SetForegroundWindow($browserHandle) | Out-Null
Start-Sleep -Milliseconds 250

$browserRoot = [System.Windows.Automation.AutomationElement]::FromHandle($browserHandle)
$toolbarRoots = Find-ToolbarRoots $browserRoot

$pinnedElement = Find-MatchingElement $toolbarRoots $targetNames 8
if ($pinnedElement -and (Invoke-OnFireElement $pinnedElement)) {
	'clicked pinned toolbar item'
	exit 0
}

$extensionsButton = Find-MatchingElement $toolbarRoots @('Extensions') 8
if ($extensionsButton -and (Invoke-OnFireElement $extensionsButton)) {
	Start-Sleep -Milliseconds 650
	$popupElement = Find-MatchingElement (Get-PopupRoots $browserHandle) $targetNames 12
	if ($popupElement -and (Invoke-OnFireElement $popupElement)) {
		'clicked extensions menu item'
		exit 0
	}
}

throw 'Could not find the extension in the browser toolbar or Extensions menu.'
`;
}

function runWindowsAutomation({browserProcessNames, extensionNames}) {
	const result = spawnSync(
		windowsPowerShellPath(),
		[
			'-NoProfile',
			'-NonInteractive',
			'-ExecutionPolicy',
			'Bypass',
			'-Command',
			buildWindowsAutomationScript({browserProcessNames, extensionNames}),
		],
		{
			encoding: 'utf8',
			timeout: 10_000,
			windowsHide: true,
		},
	);

	if (result.status !== 0) {
		throw new Error(
			sanitizeAutomationError(
				result.stderr || result.stdout || 'Windows UI automation failed.',
			),
		);
	}

	return result.stdout.trim() || 'clicked extension popup';
}

export function openExtensionPopup(request, config = readConfig()) {
	validateRequest(request);
	const extensionNames = uniqueNames([
		request.extensionName,
		...(request.extensionAliases || []),
	]);

	if (process.platform === 'win32') {
		return runWindowsAutomation({
			browserProcessNames: browserProcessNamesFromConfig(config),
			extensionNames,
		});
	}

	if (process.platform !== 'darwin') {
		throw new Error('The native popup helper supports macOS and Windows only.');
	}

	const browserApp = config.browserApp || 'Brave Browser';

	try {
		return runNativeClicker({browserApp, extensionNames});
	} catch (error) {
		if (!/Native clicker is not installed/v.test(error.message)) {
			throw error;
		}
	}

	return runAppleScript({
		browserApp,
		extensionNames,
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
