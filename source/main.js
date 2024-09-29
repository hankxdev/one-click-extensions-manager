import App from './app.svelte';
import fitWindow from './lib/fit-window.js';
import preventMultipleWindows from './lib/single-window.js';

// eslint-disable-next-line no-new -- Tell this to Svelte
new App({
	target: document.body,
});

const autoFit = new URLSearchParams(location.search).has('auto-fit');
if (autoFit) {
	fitWindow();
}

preventMultipleWindows();
