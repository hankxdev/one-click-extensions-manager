import App from './App.svelte';
import positionWindow from './lib/position-window';

new App({
	target: document.body,
});

const type = new URLSearchParams(location.search).get('type');
document.body.dataset.type = type;
if (type === 'window') {
	positionWindow();
}
