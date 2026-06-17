#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const helperDirectory = path.dirname(fileURLToPath(import.meta.url));
const [extensionId, browser = 'brave'] = process.argv.slice(2);

function usage() {
	console.error(
		'Usage: npm run helper:install -- <extension-id> [brave|chrome|edge|chromium]',
	);
}

function powershellPath() {
	if (process.env.SystemRoot) {
		return path.join(
			process.env.SystemRoot,
			'System32',
			'WindowsPowerShell',
			'v1.0',
			'powershell.exe',
		);
	}

	return 'powershell.exe';
}

function run(command, arguments_) {
	const result = spawnSync(command, arguments_, {stdio: 'inherit'});
	process.exit(result.status ?? 1);
}

if (!/^[a-p]{32}$/v.test(extensionId || '')) {
	usage();
	process.exit(2);
}

if (process.platform === 'darwin') {
	run('bash', [
		path.join(helperDirectory, 'install-macos.sh'),
		extensionId,
		browser,
	]);
}

if (process.platform === 'win32') {
	run(powershellPath(), [
		'-NoProfile',
		'-ExecutionPolicy',
		'Bypass',
		'-File',
		path.join(helperDirectory, 'install-windows.ps1'),
		'-ExtensionId',
		extensionId,
		'-Browser',
		browser,
	]);
}

console.error(
	'The native popup helper installer supports macOS and Windows only.',
);
process.exit(1);
