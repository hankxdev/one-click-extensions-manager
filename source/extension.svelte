<script>
	import openInTab from './lib/open-in-tab.js';

	export let id;
	export let name;
	export let shortName;
	export let enabled;
	export let installType;
	export let homepageUrl;
	export let updateUrl;
	export let optionsUrl;
	export let icons;
	export let showExtras;
	export let undoStack;

	const getI18N = chrome.i18n.getMessage;
	const chromeWebStoreUrl = `https://chrome.google.com/webstore/detail/${id}`;
	const edgeWebStoreUrl = `https://microsoftedge.microsoft.com/addons/detail/${id}`;
	const url = generateHomeURL();
	// The browser will still fill the "short name" with "name" if missing
	const realName = trimName(shortName ?? name);

	function generateHomeURL() {
		if (installType !== 'normal') {
			return homepageUrl;
		}

		return updateUrl.startsWith('https://edge.microsoft.com')
			? edgeWebStoreUrl
			: chromeWebStoreUrl;
	}

	// https://github.com/hankxdev/one-click-extensions-manager/issues/152
	function trimName(name) {
		return name
			.replace(/(:| [-|—]) .+$/, '')
			.replace(
				/(extension|chrome extension|browser extension|for chrome|for google chrome)$/i,
				'',
			);
	}

	function toggleExtension() {
		const wasEnabled = enabled;

		undoStack.do(toggle => {
			chrome.management.setEnabled(id, toggle !== wasEnabled);
		});
	}

	function onUninstallClick() {
		chrome.management.uninstall(id);
	}

	function getIcon(icons, size = 16) {
		// Get retina size if necessary
		size *= window.devicePixelRatio;

		if (icons) {
			// Get a large icon closest to the desired size
			for (const icon of icons.reverse()) {
				if (icon.size >= size) {
					return icon.url;
				}
			}
		}

		// Fallback icon
		return 'icons/puzzle.svg';
	}
</script>

<li class:disabled={!enabled} class="ext type-{installType}">
	<button
		type="button"
		class="ext-name"
		on:click={toggleExtension}
		on:contextmenu
	>
		<img alt="" src={getIcon(icons, 16)} />{realName}
	</button>
	{#if optionsUrl && enabled}
		<a href={optionsUrl} title={getI18N('gotoOpt')} on:click={openInTab}>
			<img src="icons/options.svg" alt="" />
		</a>
	{/if}
	{#if showExtras}
		{#if url}
			<a href={url} title={getI18N('openUrl')} target="_blank" rel="noreferrer">
				<img src="icons/globe.svg" alt="" />
			</a>
		{/if}
		<a
			href="chrome://extensions/?id={id}"
			title={getI18N('manage')}
			on:click={openInTab}
		>
			<img src="icons/ellipsis.svg" alt="" />
		</a>
		<button
			type="button"
			title={getI18N('uninstall')}
			on:click={onUninstallClick}
		>
			<img src="icons/bin.svg" alt="" />
		</button>
	{/if}
</li>
