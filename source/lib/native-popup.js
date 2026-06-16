export const nativeHostName = 'com.ocem.popuphost';

const localHelperUrl = 'http://127.0.0.1:17645/open-extension-popup';

export class PopupHelperError extends Error {
	constructor(message, details = []) {
		super(message);
		this.name = 'PopupHelperError';
		this.details = details;
	}
}

function getLastErrorMessage() {
	return chrome.runtime.lastError?.message;
}

function sendRuntimeMessage(payload, external = false) {
	return new Promise((resolve, reject) => {
		const callback = response => {
			const error = getLastErrorMessage();
			if (error) {
				reject(new Error(error));
				return;
			}

			resolve(response);
		};

		if (external) {
			chrome.runtime.sendMessage(chrome.runtime.id, payload, callback);
			return;
		}

		chrome.runtime.sendMessage(payload, callback);
	});
}

function sendNativeMessage(payload) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendNativeMessage(nativeHostName, payload, response => {
			const error = getLastErrorMessage();
			if (error) {
				reject(new Error(error));
				return;
			}

			resolve(response);
		});
	});
}

async function postLocalHelper(payload) {
	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, 5000);

	try {
		const response = await fetch(localHelperUrl, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});

		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error(
				data.error || `Local helper failed with HTTP ${response.status}`,
			);
		}

		return data;
	} catch (error) {
		throw new Error('Local native helper request failed.', {cause: error});
	} finally {
		clearTimeout(timeout);
	}
}

function assertOkResponse(response, transport) {
	if (response?.ok) {
		return response;
	}

	throw new Error(
		response?.error || `${transport} returned an invalid response.`,
	);
}

function describeError(error) {
	if (error?.cause?.message) {
		return `${error.message} ${error.cause.message}`;
	}

	return error?.message || String(error);
}

export async function openNativePopup({extensionId, extensionName}) {
	const payload = {
		type: 'open-extension-popup',
		extensionId,
		extensionName,
	};

	const attempts = [
		['native messaging', () => sendNativeMessage(payload)],
		['background bridge', () => sendRuntimeMessage(payload)],
		['external background bridge', () => sendRuntimeMessage(payload, true)],
		['local helper', () => postLocalHelper(payload)],
	];
	const failures = [];

	for (const [transport, run] of attempts) {
		try {
			// eslint-disable-next-line no-await-in-loop -- Ordered fallbacks; only try the next transport after a concrete failure.
			return assertOkResponse(await run(), transport);
		} catch (error) {
			failures.push(`${transport}: ${describeError(error)}`);
		}
	}

	throw new PopupHelperError(
		'Native popup helper is not installed or is not responding.',
		failures,
	);
}
