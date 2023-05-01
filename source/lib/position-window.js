function fitWindowToContentHeight() {
	// Sigh, the innerHeight is wildly off while loading
	const uiHeight = Math.min(50, window.outerHeight - window.innerHeight);
	const height = document.body.scrollHeight + uiHeight;
	window.resizeTo(window.outerWidth, height);
}

export default function positionWindow() {
	new ResizeObserver(fitWindowToContentHeight).observe(document.body);
}
