import optionsStorage, {matchOptions} from './options-storage';
import appUrl from 'url:./index.html';

// TODO: https://github.com/fregante/webext-options-sync/issues/63
chrome.storage.onChanged.addListener(async (changes, areaName) => {
	if (areaName === 'sync' && 'options' in changes) {
		matchOptions();
	}
});

// Must be registered on the top level
chrome.action.onClicked.addListener(async () => {
	let {position, width} = await optionsStorage.getAll();
	if (position === 'popup') {
		return;
	}

	if (position === 'tab') {
		chrome.tabs.create({url: `${appUrl}?type=tab`});
		return;
	}

	if (position === 'window') {
		width = width === '' ? 400 : Number.parseInt(width, 10); // Must be an integer
		const height = 600;
		const currentWindow = await chrome.windows.getCurrent();
		await chrome.windows.create({
			type: 'popup',
			url: `${appUrl}?type=window`,
			width,
			height,
			top: currentWindow.top + Math.round((currentWindow.height - height) / 2),
			left: currentWindow.left + Math.round((currentWindow.width - width) / 2),
		});
	}
});

matchOptions();

if (process.env.NODE_ENV === 'development') {
	chrome.tabs.create({url: `${appUrl}?type=tab`});
}
