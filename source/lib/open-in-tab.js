/** Required for chrome:// links */
export default function openInTab(event) {
	browser.tabs.create({url: event.currentTarget.href});
	event.preventDefault();
}
