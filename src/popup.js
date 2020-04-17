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

// Update list on uninstall
cme.onUninstalled.addListener(id => {
	$('#' + escapeCssId(id)).remove();
});
