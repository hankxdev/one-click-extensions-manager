import {
	getCustomNames,
	removeCustomName,
	setCustomName,
} from '../options-storage.js';

export class CustomNameManager {
	constructor() {
		this.customNames = {};
	}

	async loadCustomNames() {
		this.customNames = await getCustomNames();
		return this.customNames;
	}

	getCustomName(id) {
		return this.customNames[id] || '';
	}

	hasCustomName(id) {
		return !!this.customNames[id];
	}

	async saveCustomName(id, editName, {name, shortName}) {
		if (editName === name || editName === shortName) {
			await removeCustomName(id);
		} else {
			await setCustomName(id, editName);
		}

		await this.loadCustomNames();
		return this.customNames[id];
	}

	async resetToOriginalName(id) {
		await removeCustomName(id);
		await this.loadCustomNames();
	}
}
