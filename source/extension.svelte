<script>
	import openInTab from './lib/open-in-tab.js';
	import globeIcon from 'url:./icons/globe.svg';
	import binIcon from 'url:./icons/bin.svg';
	import ellipsisIcon from 'url:./icons/ellipsis.svg';
	import optionsIcon from 'url:./icons/options.svg';
	import puzzleIcon from 'url:./icons/puzzle.svg';

	export let id;
	export let name;
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

	function generateHomeURL() {
		if (installType !== 'normal') {
			return homepageUrl;
		}

		return updateUrl.startsWith('https://edge.microsoft.com')
			? edgeWebStoreUrl
			: chromeWebStoreUrl;
	}

	function toggleExtension() {
		const wasEnabled = enabled;

		undoStack.do(toggle => {
			enabled = toggle !== wasEnabled;
			chrome.management.setEnabled(id, enabled);
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
		return puzzleIcon;
	}
</script>

<li class:disabled={!enabled} class="ext type-{installType}">
	<button
		type="button"
		class="ext-name"
		on:click={toggleExtension}
		on:contextmenu
	>
		<img alt="" src={getIcon(icons, 16)} />{name}
	</button>
	{#if optionsUrl && enabled}
		<a href={optionsUrl} title={getI18N('gotoOpt')} on:click={openInTab}>
			<img src={optionsIcon} alt="" />
		</a>
	{/if}
	{#if showExtras}
		{#if url}
			<a href={url} title={getI18N('openUrl')} target="_blank" rel="noreferrer">
				<img src={globeIcon} alt="" />
			</a>
		{/if}
		<a
			href="chrome://extensions/?id={id}"
			title={getI18N('manage')}
			on:click={openInTab}
		>
			<img src={ellipsisIcon} alt="" />
		</a>
		<button
			type="button"
			title={getI18N('uninstall')}
			on:click={onUninstallClick}
		>
			<img src={binIcon} alt="" />
		</button>
	{/if}
</li>
