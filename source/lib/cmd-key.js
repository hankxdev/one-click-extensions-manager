const isMac = navigator.platform.includes('Mac');

/**
Replace platform-specific keyboard hint on Mac.
@param {string} string the input text (expects patterns like "Ctrl+Z")
@param {string} key the single-character key to replace
*/
export function replaceModifierIfMac(string, key) {
	if (!isMac) {
		return string;
	}

	const pattern = new RegExp(String.raw`(?<=>)[a-z]+\+${key}`, 'iv');
	const replacement = `⌘${key.toUpperCase()}`;
	return string.replace(pattern, replacement);
}

/**
Return true when the event has the platform-correct modifier held:
- Mac => metaKey (⌘)
- others => ctrlKey
*/
export function isHoldingModifier(event) {
	return isMac ? event.metaKey : event.ctrlKey;
}
