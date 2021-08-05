import App from './App.svelte';

new App({
	target: document.body,
});

// Move to App.svelte once this is supported: https://github.com/sveltejs/svelte/issues/3105
document.body.dataset.type = new URLSearchParams(location.search).get('type');
