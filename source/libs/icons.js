export default function pickBestIcon(icons, size = 16) {
	// Get retina size if necessary
	size *= globalThis.devicePixelRatio;

	if (!icons?.length) {
		return 'icons/puzzle.svg';
	}

	const smallestToLargest = icons.toSorted((a, b) => a.size - b.size);

	// Find the smallest icon that is larger than the requested size
	for (const icon of smallestToLargest) {
		if (icon.size >= size) {
			return icon.url;
		}
	}

	// If it's not available (e.g. requested 32, available only 16), get the largest one
	return smallestToLargest.at(-1).url;
}
