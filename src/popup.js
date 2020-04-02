// Handle undo/redo events
const undoStack = new UndoStack(document.body);

/**
 * GENERATE PAGE
 */
if (!localStorage.getItem('undo-info-message')) {
	$hideInfoMessage.click(() => {
		localStorage.setItem('undo-info-message', 1);
	});
}

// Enable disable all button
$disableAllButton.click(() => {
	toggleAll(false);
});
$enableAllButton.click(() => {
	toggleAll(true);
});

// Enable chrome:// links
$('body').on('click', '[href^="chrome"]', event => {
	chrome.tabs.create({url: event.currentTarget.href});
	return false;
});

// Update list on uninstall
cme.onUninstalled.addListener(id => {
	$('#' + escapeCssId(id)).remove();
});
