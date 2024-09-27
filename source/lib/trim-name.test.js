import assert from 'node:assert';
import it from 'node:test';

import trimName from './trim-name.js';

it('preserves regular names', () => {
	assert.equal(trimName('Regular name'), 'Regular name');
	assert.equal(
		trimName('One-click extension manager'),
		'One-click extension manager',
	);
});

it('trims punctuation', () => {
	assert.equal(trimName('Dash — extension that does stuff'), 'Dash');
	assert.equal(trimName('Em Dash — useless information'), 'Em Dash');
	assert.equal(trimName('Semicolon: Do things'), 'Semicolon');
	assert.equal(trimName('French semicolon : Do things'), 'French semicolon');
});

it('trims keywords', () => {
	assert.equal(trimName('Cake Search Extension'), 'Cake Search');
	assert.equal(trimName('Coconuts for Chrome'), 'Coconuts');
	assert.equal(trimName('Electric Fans for Google Chrome'), 'Electric Fans');
	assert.equal(trimName('Blonde browser extension'), 'Blonde');
});

it('never returns an empty string', () => {
	assert.equal(trimName('Chrome Extension'), 'Chrome Extension');
});
