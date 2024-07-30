export default class UndoStack {
	_undoStack = [];
	_redoStack = [];
	static isMac = navigator.platform.includes('Mac');
	static replaceKbdOnMac = string =>
		UndoStack.isMac
			// Some locales don't call it "ctrl"
			? string.replace(/(?<=>)[a-z]+\+z/i, '⌘Z')
			: string;

	constructor(element) {
		if (element) {
			element.addEventListener('keydown', this.#keyboardEventListener);
		}
	}

	#keyboardEventListener = event => {
		if (
			event.code === 'KeyZ'
			&& (UndoStack._isMac ? event.metaKey : event.ctrlKey)
		) {
			if (event.shiftKey) {
				this.redo();
			}
			else {
				this.undo();
			}

			// Without this, it will also undo the filter input field.
			// That's never useful, so it's best to never allow nor exclude it.
			event.preventDefault();
		}
	};

	undo() {
		const functions = this._undoStack.pop();
		if (functions) {
			console.log('UndoStack: undo');
			const [toggleFunction, undoFunction] = functions;
			(undoFunction || toggleFunction)(false);
			this._redoStack.push(functions);
		}
		else {
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
		}
		else {
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
