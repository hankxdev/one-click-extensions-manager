import browser from 'webextension-polyfill';
window.browser = browser;
import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'world'
	}
});

export default app;

// TODO: maybe move this in App.svelte
document.body.addEventListener('click', event => {
	const clickedChromeLink = event.target.closest('[href^="chrome"]');
	if (clickedChromeLink) {
		browser.tabs.create({url: clickedChromeLink.href});
		return false;
	}
});

document.body.dataset.type = new URLSearchParams(location.search).get('type');
