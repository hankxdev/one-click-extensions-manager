import OptionsSync from 'webext-options-sync';
import {actionPopupPosition, normalizeActionPosition} from './lib/action-mode.js';

const optionsStorage = new OptionsSync({
	defaults: {
		position: actionPopupPosition,
		showButtons: 'on-demand', // Or 'always'
		width: '',
		pinnedExtensions: [],
	},
	migrations: [
		options => {
			const position = normalizeActionPosition(options.position);
			if (options.position !== position) {
				options.position = position;
			}
		},
		options => {
			let {width} = options;
			// Ignore if unset
			if (!width) {
				return;
			}

			// Parse them and clamp the value
			width = Math.min(Math.max(250, Number.parseInt(width, 10)), 1000);

			options.width = Number.isNaN(width) ? '' : width;
		},
		OptionsSync.migrations.removeUnused,
	],
});

export default optionsStorage;

export async function togglePin(extensionId) {
	const {pinnedExtensions} = await optionsStorage.getAll();
	const pins = new Set(pinnedExtensions);

	const pinned = !pins.delete(extensionId);
	if (pinned) {
		pins.add(extensionId);
	}

	await optionsStorage.set({pinnedExtensions: [...pins]});
	return pinned;
}

const defaultPopup = chrome.runtime.getManifest().action.default_popup;

export async function matchOptions() {
	const options = await optionsStorage.getAll();
	const position = normalizeActionPosition(options.position);
	if (options.position !== position) {
		await optionsStorage.set({position});
	}

	chrome.action.setPopup({popup: defaultPopup});

	chrome.sidePanel?.setOptions?.({enabled: false});
	chrome.sidePanel?.setPanelBehavior?.({openPanelOnActionClick: false});
}
