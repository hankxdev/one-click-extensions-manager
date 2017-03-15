window.UndoStack = class UndoStack {
	constructor(element) {
		this._undoStack = [];
		this._redoStack = [];
		this._Z_KEY = 90;
		if (element) {
			element.addEventListener('keydown', event => {
				const key = event.keyCode || event.which;
				if (key === this._Z_KEY && (navigator.userAgent.match(/win/i) ? event.ctrlKey : event.metaKey)) {
					if (event.shiftKey) {
						this.redo();
					}
					else {
						this.undo();
					}
				}
			});
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
		console.log('pushed')
		if (typeof doFn !== 'function') {
			throw new Error('you must pass at least one function');
		}
		if (undoFn && typeof undoFn !== 'function') {
			throw new Error('undoFn must be a function or undefined');
		}
		this._redoStack.length = 0;
		this._undoStack.push([doFn, undoFn]);
		doFn();
	}

	clear() {
		this._undoStack.length = 0;
		this._redoStack.length = 0;
	}
}
