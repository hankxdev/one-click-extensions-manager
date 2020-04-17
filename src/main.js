import browser from 'webextension-polyfill'
window.browser = browser;
import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'world'
	}
});

export default app;

document.body.addEventListener('click', event => {
	const clickedChromeLink = event.target.closest('[href^="chrome"]');
	if (clickedChromeLink) {
		chrome.tabs.create({url: clickedChromeLink.href});
		return false;
	}
});
