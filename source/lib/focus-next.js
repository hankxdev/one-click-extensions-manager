function focus(selector, next) {
	const {activeElement} = document;
	const items = [...document.querySelectorAll(selector)];
	if (!next) {
		items.reverse();
	}

	for (const item of items) {
		const position = activeElement.compareDocumentPosition(item);
		if (
			position
			& (next
				? Node.DOCUMENT_POSITION_FOLLOWING
				: Node.DOCUMENT_POSITION_PRECEDING)
		) {
			item.focus();
			return;
		}
	}

	items.at(0).focus();
}

export function focusNext(selector) {
	focus(selector, true);
}

export function focusPrevious(selector) {
	focus(selector, false);
}
