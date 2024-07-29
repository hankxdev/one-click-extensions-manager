import App from './app.svelte';
import fitWindow from './lib/fit-window';

new App({
	target: document.body,
});

const autoFit = new URLSearchParams(location.search).has('auto-fit');
if (autoFit) {
	fitWindow();
}

chrome.runtime.sendMessage('thisTownIsTooSmallForTheTwoOfUs');
chrome.runtime.onMessage.addListener(message => {
	if (message === 'thisTownIsTooSmallForTheTwoOfUs') {
		window.close();
	}
});
