window.UndoStack = class UndoStack {
	constructor(element) {
		this._undoStack = [];
		this._redoStack = [];
		this._Z_KEY = 90;
		this._isWin = navigator.userAgent.match(/win/i);
		if (element) {
			element.addEventListener('keydown', e => this._keyboardEventListener(e));
		}
	}

	_keyboardEventListener(e) {
		if (e.keyCode === this._Z_KEY && (this._isWin ? e.ctrlKey : e.metaKey)) {
			if (e.shiftKey) {
				this.redo();
			} else {
				this.undo();
			}
		}
	}

	undo() {
		const functions = this._undoStack.pop();
		if (functions) {
			console.log('UndoStack: undo');
			const [toggleFn, undoFn] = functions;
			(undoFn || toggleFn)(false);
			this._redoStack.push(functions);
		} else {
			console.warn('UndoStack: nothing to undo');
		}
	}

	redo() {
		const functions = this._redoStack.pop();
		if (functions) {
			console.log('UndoStack: redo');
			const [doFn] = functions;
			doFn(true);
			this._undoStack.push(functions);
		} else {
			console.warn('UndoStack: nothing to redo');
		}
	}

	do(doFn, undoFn) {
		console.log('UndoStack: pushed');
		if (typeof doFn !== 'function') {
			throw new TypeError('you must pass at least one function');
		}
		if (undoFn && typeof undoFn !== 'function') {
			throw new Error('undoFn must be a function or undefined');
		}
		this._redoStack.length = 0;
		this._undoStack.push([doFn, undoFn]);
		doFn(true);
	}

	clear() {
		this._undoStack.length = 0;
		this._redoStack.length = 0;
	}
};
