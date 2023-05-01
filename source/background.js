import optionsStorage from './options-storage';

const defaultPopup = chrome.runtime.getManifest().action.default_popup;

async function updatePopup() {
	const {position} = await optionsStorage.getAll();
	chrome.action.setPopup({popup: position === 'popup' ? defaultPopup : ''});
}

// TODO: https://github.com/fregante/webext-options-sync/issues/63
chrome.storage.onChanged.addListener(async (changes, areaName) => {
	if (areaName === 'sync' && 'options' in changes) {
		updatePopup();
	}
});

// Must be registered on the top level
chrome.action.onClicked.addListener(async () => {
	let {position, width} = await optionsStorage.getAll();
	width = width === '' ? 400 : Number.parseInt(width, 10); // Must be an integer
	const height = 600;
	if (position === 'popup') {
		return;
	}

	if (position === 'window') {
		const currentWindow = await chrome.windows.getCurrent();
		await chrome.windows.create({
			type: 'popup',
			url: chrome.runtime.getURL('index.html?type=window'),
			width,
			height,
			top: currentWindow.top + Math.round((currentWindow.height - height) / 2),
			left: currentWindow.left + Math.round((currentWindow.width - width) / 2),
		});
		return;
	}

	if (position === 'tab') {
		chrome.tabs.create({url: chrome.runtime.getURL('index.html?type=tab')});
	}
});

updatePopup();
