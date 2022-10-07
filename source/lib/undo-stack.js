export default class UndoStack {
	constructor(element) {
		this._undoStack = [];
		this._redoStack = [];
		this._Z_KEY = 90;
		this._isWin = navigator.userAgent.match(/win/i);
		if (element) {
			element.addEventListener(
				'keydown',
				this._keyboardEventListener.bind(this)
			);
		}
	}

	_keyboardEventListener(event) {
		if (
			event.keyCode === this._Z_KEY &&
			(this._isWin ? event.ctrlKey : event.metaKey)
		) {
			if (event.shiftKey) {
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
			const [toggleFunction, undoFunction] = functions;
			(undoFunction || toggleFunction)(false);
			this._redoStack.push(functions);
		} else {
			console.warn('UndoStack: nothing to undo');
		}
	}

	redo() {
		const functions = this._redoStack.pop();
		if (functions) {
			console.log('UndoStack: redo');
			const [doFunction] = functions;
			doFunction(true);
			this._undoStack.push(functions);
		} else {
			console.warn('UndoStack: nothing to redo');
		}
	}

	do(doFunction, undoFunction) {
		console.log('UndoStack: pushed');
		if (typeof doFunction !== 'function') {
			throw new TypeError('you must pass at least one function');
		}

		if (undoFunction && typeof undoFunction !== 'function') {
			throw new Error('undoFn must be a function or undefined');
		}

		this._redoStack.length = 0;
		this._undoStack.push([doFunction, undoFunction]);
		doFunction(true);
	}

	clear() {
		this._undoStack.length = 0;
		this._redoStack.length = 0;
	}
}
