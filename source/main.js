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

document.documentElement.setAttribute('lang', browser.i18n.getUILanguage());
document.documentElement.setAttribute('dif', browser.i18n.getMessage('@@bidi_dir'));

document.body.dataset.type = new URLSearchParams(location.search).get('type');
