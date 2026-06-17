import optionsStorage from '../options-storage.js';

function fillInTheBlanks(extension, {folder, folderId, isPinned = false}) {
	extension.indexedName = extension.name.toLowerCase();
	extension.isPinned = isPinned;
	extension.folderId = folderId;
	extension.folderName = folder?.name ?? '';
	return extension;
}

export default async function prepareExtensionList(extensions) {
	const {extensionFolderAssignments, extensionFolders, pinnedExtensions} =
		await optionsStorage.getAll();
	const foldersById = new Map(
		extensionFolders.map(folder => [folder.id, folder]),
	);

	return extensions
		.filter(({type, id}) => type === 'extension' && id !== chrome.runtime.id)
		.toSorted((a, b) => {
			const aPinned = pinnedExtensions.includes(a.id);
			const bPinned = pinnedExtensions.includes(b.id);

			// First sort by pinned status
			if (aPinned !== bPinned) {
				return bPinned ? 1 : -1; // Pinned extensions first
			}

			// If both are pinned or both are not pinned, sort by enabled status
			if (a.enabled === b.enabled) {
				return a.name.localeCompare(b.name); // Sort by name
			}

			return a.enabled < b.enabled ? 1 : -1; // Enabled extensions first
		})
		.map(extension => {
			const assignedFolderId = extensionFolderAssignments[extension.id];
			const folder = foldersById.get(assignedFolderId);

			return fillInTheBlanks(extension, {
				folder,
				folderId: folder ? assignedFolderId : '',
				isPinned: pinnedExtensions.includes(extension.id),
			});
		});
}
