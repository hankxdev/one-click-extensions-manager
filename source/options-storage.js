import OptionsSync from 'webext-options-sync';

const optionsStorage = new OptionsSync({
	defaults: {
		position: 'popup',
		showButtons: 'on-demand', // Or 'always'
		width: '',
		pinnedExtensions: [],
	},
	migrations: [
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
	const {position} = await optionsStorage.getAll();
	chrome.action.setPopup({popup: position === 'popup' ? defaultPopup : ''});

	const inSidebar = position === 'sidebar';
	chrome.sidePanel.setOptions({enabled: inSidebar});
	chrome.sidePanel.setPanelBehavior({
		openPanelOnActionClick: inSidebar,
	});
}
