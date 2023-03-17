import optionsStorage from '../options-storage.js';

optionsStorage.syncForm(document.querySelector('form'));

function openTab() {
	chrome.tabs.create({url: 'index.html'});
}

document
	.querySelector('#openingStyle')
	.addEventListener('change', async ({target}) => {
		const isPopup = target.value === 'popup';
		await chrome.action.setPopup({
			popup: isPopup ? 'index.html?type=popup' : '',
		});
		if (isPopup) {
			chrome.action.onClicked.removeListener(openTab);
		} else {
			chrome.action.onClicked.addListener(openTab);
		}
	});
