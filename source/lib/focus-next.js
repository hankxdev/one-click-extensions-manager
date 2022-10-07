export function focusNext(selector) {
	const {activeElement} = document;
	const items = [...document.querySelectorAll(selector)];
	for (const item of items) {
		const position = activeElement.compareDocumentPosition(item);
		// eslint-disable-next-line no-bitwise -- https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
		if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
			item.focus();
			return;
		}
	}

	items.at(0).focus();
}

export function focusPrevious(selector) {
	const {activeElement} = document;
	const items = [...document.querySelectorAll(selector)].reverse();
	for (const item of items) {
		const position = activeElement.compareDocumentPosition(item);
		// eslint-disable-next-line no-bitwise -- https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
		if (position & Node.DOCUMENT_POSITION_PRECEDING) {
			item.focus();
			return;
		}
	}

	items.at(0).focus();
}
