function fillInTheBlanks(extension) {
	extension.shown = true;
	extension.indexedName = extension.name.toLowerCase();
	return extension;
}

export default function prepareExtensionList(extensions) {
	return extensions
		.filter(({type, id}) => type === 'extension' && id !== chrome.runtime.id)
		.sort((a, b) => {
			if (a.enabled === b.enabled) {
				return a.name.localeCompare(b.name); // Sort by name
			}

			return a.enabled < b.enabled ? 1 : -1; // Sort by state
		})
		.map(extension => fillInTheBlanks(extension));
}
