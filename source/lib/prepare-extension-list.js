function fillInTheBlanks(extension, isPinned = false) {
	extension.shown = true;
	extension.indexedName = extension.name.toLowerCase();
	extension.isPinned = isPinned;
	return extension;
}

export default function prepareExtensionList(
	extensions,
	pinnedExtensions = [],
) {
	return extensions
		.filter(({type, id}) => type === 'extension' && id !== chrome.runtime.id)
		.sort((a, b) => {
			const aPinned = pinnedExtensions.includes(a.id);
			const bPinned = pinnedExtensions.includes(b.id);

			// First sort by pinned status
			if (aPinned !== bPinned) {
				return bPinned ? 1 : -1; // Pinned extensions come first
			}

			// If both are pinned or both are not pinned, sort by enabled status
			if (a.enabled === b.enabled) {
				return a.name.localeCompare(b.name); // Sort by name
			}

			return a.enabled < b.enabled ? 1 : -1; // Sort by state
		})
		.map(extension =>
			fillInTheBlanks(extension, pinnedExtensions.includes(extension.id)),
		);
}
