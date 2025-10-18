import OptionsSync from 'webext-options-sync';

const optionsStorage = new OptionsSync({
	defaults: {
		position: 'popup',
		showButtons: 'on-demand', // Or 'always'
		width: '',
		pinnedExtensions: [], // Array of pinned extension IDs
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
		// Migration to add pinnedExtensions if it doesn't exist
		options => {
			if (!options.pinnedExtensions) {
				options.pinnedExtensions = [];
			}
		},
	],
});

export default optionsStorage;

// Helper functions for managing pinned extensions
export async function togglePin(extensionId) {
	const options = await optionsStorage.getAll();
	const pinnedExtensions = [...options.pinnedExtensions];
	const index = pinnedExtensions.indexOf(extensionId);

	if (index > -1) {
		// Unpin
		pinnedExtensions.splice(index, 1);
	} else {
		// Pin
		pinnedExtensions.push(extensionId);
	}

	await optionsStorage.set({pinnedExtensions});
	return index === -1; // Return true if pinned, false if unpinned
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
