import test from 'node:test';
import assert from 'node:assert/strict';
import {actionPopupPosition, normalizeActionPosition} from './action-mode.js';

test('normalizes every legacy action mode to the browser popup', () => {
	for (const position of ['popup', 'tab', 'window', 'sidebar', '', undefined]) {
		assert.equal(normalizeActionPosition(position), actionPopupPosition);
	}
});
