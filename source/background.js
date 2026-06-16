import optionsStorage, {matchOptions} from './options-storage.js';

const nativeHostName = 'com.ocem.popuphost';

function isValidExtensionId(extensionId) {
	return /^[a-p]{32}$/v.test(extensionId);
}

function isTrustedSender(sender) {
	return (
		sender.id === chrome.runtime.id ||
		sender.origin === chrome.runtime.getURL('').slice(0, -1)
	);
}

function handleNativePopupRequest(message, sender, sendResponse) {
	if (message?.type !== 'open-extension-popup') {
		return false;
	}

	if (!isTrustedSender(sender)) {
		sendResponse({ok: false, error: 'Unexpected extension message sender.'});
		return false;
	}

	if (
		!isValidExtensionId(message.extensionId) ||
		typeof message.extensionName !== 'string' ||
		message.extensionName.trim() === ''
	) {
		sendResponse({ok: false, error: 'Invalid extension popup request.'});
		return false;
	}

	chrome.runtime.sendNativeMessage(
		nativeHostName,
		{
			type: 'open-extension-popup',
			extensionId: message.extensionId,
			extensionName: message.extensionName,
		},
		response => {
			const failure = chrome.runtime.lastError?.message;
			if (failure) {
				sendResponse({ok: false, error: failure});
				return;
			}

			sendResponse(
				response?.ok
					? response
					: {ok: false, error: 'Native host returned an invalid response.'},
			);
		},
	);

	return true;
}

function syncActionMode() {
	matchOptions().catch(error => {
		console.warn('Failed to sync action mode:', error);
	});
}

syncActionMode();
optionsStorage.onChanged((current, old) => {
	if (old.position !== current.position) {
		syncActionMode();
	}
});

chrome.runtime.onMessage.addListener(handleNativePopupRequest);
chrome.runtime.onMessageExternal.addListener(handleNativePopupRequest);

// Must be registered on the top level
chrome.action.onClicked.addListener(async () => {
	let {position, width} = await optionsStorage.getAll();

	// 'popup' and 'sidebar' are handled by the browser
	if (position === 'window') {
		width = width === '' ? 400 : Number.parseInt(width, 10); // Must be an integer
		const height = 600;
		const currentWindow = await chrome.windows.getCurrent();
		await chrome.windows.create({
			type: 'popup',
			url: chrome.runtime.getURL('index.html?auto-fit=true'),
			width,
			height,
			top: currentWindow.top + Math.round((currentWindow.height - height) / 2),
			left: currentWindow.left + Math.round((currentWindow.width - width) / 2),
		});
	}
});
