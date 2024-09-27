export default function pickBestIcon(icons, size = 16) {
	// Get retina size if necessary
	size *= globalThis.devicePixelRatio;

	if (!icons?.length) {
		return 'icons/puzzle.svg';
	}

	const largestToSmallest = icons.toSorted((a, b) => b.size - a.size);

	// Find the smallest icon that is larger than the requested size
	for (const icon of largestToSmallest) {
		if (icon.size >= size) {
			return icon.url;
		}
	}

	// If it's not available (e.g. requested 32, available only 16), get the largest one
	return largestToSmallest[0].url;
}
