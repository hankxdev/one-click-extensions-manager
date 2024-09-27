// https://github.com/hankxdev/one-click-extensions-manager/issues/152
export default function trimName(name) {
	const trimmed = name
		// Only trim names if the punctuation is surrounded by spaces, except for colons, which don't need a preceding space
		.replace(/( ?:| [-|—]) .+$/, '')
		.replace(
			/(extension|chrome extension|browser extension|for chrome|for google chrome)$/i,
			'',
		)
		.trim();

	// In the unlikely scenario that the name is trimmed entirely, return the original name
	return trimmed || name;
}
