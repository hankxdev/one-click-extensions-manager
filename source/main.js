import App from './App.svelte';

export default new App({
	target: document.body
});

// TODO: maybe move this in App.svelte
document.body.addEventListener('click', event => {
	const clickedChromeLink = event.target.closest('[href^="chrome"]');
	if (clickedChromeLink) {
		browser.tabs.create({url: clickedChromeLink.href});
		return false;
	}
});

// Move to Svelte once this is supported: https://github.com/sveltejs/svelte/issues/3105
document.documentElement.setAttribute('lang', browser.i18n.getUILanguage());
document.documentElement.setAttribute('dif', browser.i18n.getMessage('@@bidi_dir'));

document.body.dataset.type = new URLSearchParams(location.search).get('type');
