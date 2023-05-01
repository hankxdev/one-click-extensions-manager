import optionsStorage from './options-storage';

const defaultPopup = chrome.runtime.getManifest().action.default_popup;

async function updatePopup() {
	const {position} = await optionsStorage.getAll();
	chrome.action.setPopup({popup: position === 'popup' ? defaultPopup : ''});
}

chrome.storage.onChanged.addListener(async (changes, areaName) => {
	if (areaName === 'sync' && 'options' in changes) {
		updatePopup();
	}
});

// Must be registered on the top level
chrome.action.onClicked.addListener(async () => {
	const {position, width} = await optionsStorage.getAll();
	const widthNumber = width === '' ? 400 : Number(width);
	const heightNumber = 600;
	if (position === 'popup') {
		return;
	}

	if (position === 'window') {
		await chrome.windows.create({
			type: 'popup',
			url: chrome.runtime.getURL('index.html?type=window'),
			width: widthNumber,
			height: heightNumber,
		});
		return;
	}

	if (position === 'tab') {
		chrome.tabs.create({url: chrome.runtime.getURL('index.html?type=tab')});
	}
});

updatePopup();
