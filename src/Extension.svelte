<script>
	export let id;
	export let name;
	export let enabled;
	export let installType;
	export let homepageUrl;
	export let optionsUrl;
	export let icons;
	export let showExtras;
	export let undoStack;

	const getI18N = chrome.i18n.getMessage;
	const url = installType === 'normal' ? `https://chrome.google.com/webstore/detail/${id}` : homepageUrl;

	function onExtensionClick() {
		const wasEnabled = enabled;

		undoStack.do(toggle => {
			browser.management.setEnabled(id, toggle !== wasEnabled);
			enabled = toggle !== wasEnabled;
		});
	}

	function onUninstallClick() {
		browser.management.uninstall(id);
	}

	function getIcon(icons, size = 16) {
		// Set fallback icon
		let selectedIcon = 'icons/puzzle.svg';

		// Get retina size if necessary
		size *= window.devicePixelRatio;

		if (icons && icons.length > 0) {
			// Get a large icon closest to the desired size
			icons.reverse().some(icon => {
				if (icon.size < size) {
					return false;
				}

				selectedIcon = icon.url;
				return true;
			});
		}

		return selectedIcon;
	}
</script>

<li class:disabled={!enabled} class="ext type-{installType}" id={id}>
	<button type="button" class="extName" on:click={onExtensionClick} on:contextmenu>
		<img class="extIcon" alt="" src={getIcon(icons, 16)}>{name}
	</button>

	{#if optionsUrl}
		<a class='extOptions' href='chrome://extensions/?options={id}' title={getI18N('gotoOpt')} target='_blank'></a>
	{/if}
	{#if showExtras}
		{#if url}
			<a class="extUrl" href={url} title={getI18N('openUrl')} target="_blank"></a>
		{/if}
		<a class="extMore" href="chrome://extensions/?id={id}" title="See in Chrome’s extensions page" target="_blank"></a>
		<button type="button" class="extUninstall" title={getI18N('uninstall')} on:click={onUninstallClick}></button>
	{/if}
</li>
