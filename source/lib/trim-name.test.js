import {expect, it} from 'vitest';
import trimName from './trim-name.js';

it('preserves regular names', () => {
	expect(trimName('Regular name')).toBe('Regular name');
	expect(trimName('One-click extension manager')).toBe('One-click extension manager');
});

it('trims punctuation', () => {
	expect(trimName('Dash — extension that does stuff')).toBe('Dash');
	expect(trimName('Em Dash — useless information')).toBe('Em Dash');
	expect(trimName('Semicolon: Do things')).toBe('Semicolon');
	expect(trimName('French semicolon : Do things')).toBe('French semicolon');
});

it ('trims keywords', () => {
	expect(trimName('Cake Search Extension')).toBe('Cake Search');
	expect(trimName('Coconuts for Chrome')).toBe('Coconuts');
	expect(trimName('Electric Fans for Google Chrome')).toBe('Electric Fans');
	expect(trimName('Blonde browser extension')).toBe('Blonde');
});

it('never returns an empty string', () => {
	expect(trimName('Chrome Extension')).toBe('Chrome Extension');
});
