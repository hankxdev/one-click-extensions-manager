function fitWindowToContentHeight() {
	// Sigh, the innerHeight is wildly off while loading
	const uiHeight = Math.min(50, window.outerHeight - window.innerHeight);
	const height = document.body.scrollHeight + uiHeight;
	window.resizeTo(window.outerWidth, height);
}

export default function positionWindow() {
	// Center self on screen
	const left = screen.width / 2 - window.outerWidth / 2;
	const top = screen.height / 2 - window.outerHeight / 2;
	window.moveTo(left, top);

	// Fit height to content, but do it after the initial centering or it will be too low
	new ResizeObserver(fitWindowToContentHeight).observe(document.body);
}
