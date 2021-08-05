/** Required for chrome:// links */
export default function openInTab(event) {
	chrome.tabs.create({url: event.currentTarget.href});
	event.preventDefault();
}
