import App from './App.svelte';

new App({
	target: document.body
});

// Move to App.svelte once this is supported: https://github.com/sveltejs/svelte/issues/3105
document.documentElement.setAttribute('lang', browser.i18n.getUILanguage());
document.documentElement.setAttribute('dif', browser.i18n.getMessage('@@bidi_dir'));
document.body.dataset.type = new URLSearchParams(location.search).get('type');
