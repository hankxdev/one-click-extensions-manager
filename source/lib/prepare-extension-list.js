import optionsStorage from '../options-storage';

function fillInTheBlanks(extension, isPinned = false) {
	extension.shown = true;
	extension.indexedName = extension.name.toLowerCase();
	extension.isPinned = isPinned;
	return extension;
}

export default async function prepareExtensionList(extensions) {
	const {pinnedExtensions} = await optionsStorage.getAll();

	return extensions
		.filter(({type, id}) => type === 'extension' && id !== chrome.runtime.id)
		.sort((a, b) => {
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
		.map(extension =>
			fillInTheBlanks(extension, pinnedExtensions.includes(extension.id)),
		);
}
