import App from './app.svelte';
import fitWindow from './lib/fit-window';

new App({
	target: document.body,
});

const type = new URLSearchParams(location.search).get('type');
document.documentElement.dataset.type = type;
if (type === 'window') {
	fitWindow();
}

chrome.runtime.sendMessage('thisTownIsTooSmallForTheTwoOfUs');
chrome.runtime.onMessage.addListener(message => {
	if (message === 'thisTownIsTooSmallForTheTwoOfUs') {
		window.close();
	}
});
