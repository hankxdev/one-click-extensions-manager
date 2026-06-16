#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {Buffer} from 'node:buffer';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {
	frameNativeMessage,
	readNativeMessage,
	validateRequest,
} from './native-host.mjs';

const helperDirectory = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(helperDirectory, 'native-host-config.json');
const nativeHostPath = path.join(helperDirectory, 'native-host.mjs');
const port = 17_645;
const loopbackHost = '127.0.0.1';

function readConfig() {
	return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function allowedOrigin() {
	return `chrome-extension://${readConfig().extensionId}`;
}

function writeJson(response, status, payload, origin) {
	response.writeHead(status, {
		'content-type': 'application/json',
		'access-control-allow-origin': origin || 'null',
		'access-control-allow-headers': 'content-type',
		'access-control-allow-methods': 'POST, OPTIONS',
	});
	response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		request.on('data', chunk => {
			size += chunk.length;
			if (size > 16_384) {
				reject(new Error('Request body too large.'));
				request.destroy();
				return;
			}

			chunks.push(chunk);
		});
		request.on('end', () => {
			resolve(Buffer.concat(chunks).toString('utf8'));
		});
		request.on('error', reject);
	});
}

function runNativeHost(payload) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [nativeHostPath], {
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		const stdout = [];
		const stderr = [];
		const timer = setTimeout(() => {
			child.kill();
			reject(new Error('Native host timed out.'));
		}, 10_000);

		child.stdout.on('data', chunk => stdout.push(chunk));
		child.stderr.on('data', chunk => stderr.push(chunk));
		child.on('error', error => {
			clearTimeout(timer);
			reject(error);
		});
		child.on('close', code => {
			clearTimeout(timer);
			if (code !== 0) {
				reject(
					new Error(
						Buffer.concat(stderr).toString('utf8') ||
							`Native host exited with code ${code}.`,
					),
				);
				return;
			}

			try {
				resolve(readNativeMessage(Buffer.concat(stdout)));
			} catch (error) {
				reject(error);
			}
		});
		child.stdin.end(frameNativeMessage(payload));
	});
}

async function handlePopupRequest(request, response, origin) {
	try {
		const payload = JSON.parse(await readRequestBody(request));
		validateRequest(payload);
		writeJson(response, 200, await runNativeHost(payload), origin);
	} catch (error) {
		writeJson(
			response,
			400,
			{ok: false, error: error.message || 'Local popup helper failed.'},
			origin,
		);
	}
}

const server = http.createServer(async (request, response) => {
	const {origin} = request.headers;
	const expectedOrigin = allowedOrigin();

	if (request.method === 'GET' && request.url === '/health') {
		writeJson(
			response,
			200,
			{ok: true},
			origin === expectedOrigin ? expectedOrigin : undefined,
		);
		return;
	}

	if (origin !== expectedOrigin) {
		writeJson(response, 403, {
			ok: false,
			error: 'Local popup helper rejected an unexpected origin.',
		});
		return;
	}

	if (request.method === 'OPTIONS') {
		writeJson(response, 204, {}, expectedOrigin);
		return;
	}

	if (request.method !== 'POST' || request.url !== '/open-extension-popup') {
		writeJson(
			response,
			404,
			{ok: false, error: 'Unknown local popup helper route.'},
			expectedOrigin,
		);
		return;
	}

	await handlePopupRequest(request, response, expectedOrigin);
});

server.listen(port, loopbackHost, () => {
	console.log(
		`Native popup helper listening on http://${loopbackHost}:${port}`,
	);
});
