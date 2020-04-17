// Handle undo/redo events
const undoStack = new UndoStack(document.body);


// Enable disable all button
$disableAllButton.click(() => {
	toggleAll(false);
});
$enableAllButton.click(() => {
	toggleAll(true);
});

