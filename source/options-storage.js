import OptionsSync from 'webext-options-sync';
import {
	actionPopupPosition,
	normalizeActionPosition,
} from './lib/action-mode.js';

const optionsStorage = new OptionsSync({
	defaults: {
		position: actionPopupPosition,
		showButtons: 'on-demand', // Or 'always'
		width: '',
		pinnedExtensions: [],
		extensionFolders: [],
		extensionFolderAssignments: {},
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

function normalizeFolderName(name) {
	return name.trim().replaceAll(/\s+/gv, ' ').slice(0, 32);
}

function createFolderId() {
	return `folder-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 8)}`;
}

export async function createExtensionFolder(name) {
	const folderName = normalizeFolderName(name);
	if (!folderName) {
		throw new Error('Folder name is required.');
	}

	const {extensionFolders} = await optionsStorage.getAll();
	const folder = {
		id: createFolderId(),
		name: folderName,
	};

	await optionsStorage.set({extensionFolders: [...extensionFolders, folder]});
	return folder;
}

export async function renameExtensionFolder(folderId, name) {
	const folderName = normalizeFolderName(name);
	if (!folderName) {
		throw new Error('Folder name is required.');
	}

	const {extensionFolders} = await optionsStorage.getAll();
	await optionsStorage.set({
		extensionFolders: extensionFolders.map(folder =>
			folder.id === folderId ? {...folder, name: folderName} : folder,
		),
	});
}

export async function deleteExtensionFolder(folderId) {
	const {extensionFolders, extensionFolderAssignments} =
		await optionsStorage.getAll();
	const assignments = {...extensionFolderAssignments};

	for (const [extensionId, assignedFolderId] of Object.entries(assignments)) {
		if (assignedFolderId === folderId) {
			delete assignments[extensionId];
		}
	}

	await optionsStorage.set({
		extensionFolders: extensionFolders.filter(({id}) => id !== folderId),
		extensionFolderAssignments: assignments,
	});
}

export async function assignExtensionFolder(extensionId, folderId) {
	const {extensionFolders, extensionFolderAssignments} =
		await optionsStorage.getAll();
	const assignments = {...extensionFolderAssignments};

	if (!folderId) {
		delete assignments[extensionId];
	} else if (extensionFolders.some(({id}) => id === folderId)) {
		assignments[extensionId] = folderId;
	}

	await optionsStorage.set({extensionFolderAssignments: assignments});
}

export async function removeExtensionPreferences(extensionId) {
	const {extensionFolderAssignments, pinnedExtensions} =
		await optionsStorage.getAll();
	const assignments = {...extensionFolderAssignments};

	delete assignments[extensionId];

	await optionsStorage.set({
		extensionFolderAssignments: assignments,
		pinnedExtensions: pinnedExtensions.filter(id => id !== extensionId),
	});
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
