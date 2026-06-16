export function getPrimaryAction(extension) {
	if (!extension.enabled) {
		return extension.mayEnable === false
			? {type: 'unavailable'}
			: {type: 'enable'};
	}

	return {type: 'popup'};
}
