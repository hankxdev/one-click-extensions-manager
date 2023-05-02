import App from './App.svelte';
import fitWindow from './lib/fit-window';

new App({
	target: document.body,
});

const type = new URLSearchParams(location.search).get('type');
document.body.dataset.type = type;
if (type === 'window') {
	fitWindow();
}
