export default function preventMultipleWindows() {
	chrome.runtime.sendMessage('thisTownIsTooSmallForTheTwoOfUs').catch(() => {
		// No other windows open, good!
	});
	chrome.runtime.onMessage.addListener(message => {
		if (message === 'thisTownIsTooSmallForTheTwoOfUs') {
			window.close();
		}
	});
}
