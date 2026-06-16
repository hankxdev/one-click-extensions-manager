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
		message.extensionName.trim() === '' ||
		(message.extensionAliases !== undefined &&
			(!Array.isArray(message.extensionAliases) ||
				message.extensionAliases.some(alias => typeof alias !== 'string')))
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
			extensionAliases: message.extensionAliases || [],
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
