import {mount} from 'svelte';
import App from './app.svelte';
import fitWindow from './lib/fit-window.js';
import preventMultipleWindows from './lib/single-window.js';

mount(App, {target: document.body});

const autoFit = new URLSearchParams(globalThis.location.search).has('auto-fit');
if (autoFit) {
	fitWindow();
}

preventMultipleWindows();
