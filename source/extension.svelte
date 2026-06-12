<script>
	import pickBestIcon from './lib/icons.js';
	import openInTab from './lib/open-in-tab.js';
	import trimName from './lib/trim-name.js';

	const {
		id,
		name,
		shortName,
		enabled = $bindable(),
		installType,
		homepageUrl,
		updateUrl = undefined,
		optionsUrl,
		icons = undefined,
		showExtras = $bindable(),
		undoStack,
		isPinned = false,
		onpin,
		oncontextmenu,
	} = $props();

	const getI18N = chrome.i18n.getMessage;
	const chromeWebStoreUrl = `https://chrome.google.com/webstore/detail/${id}`;
	const edgeWebStoreUrl = `https://microsoftedge.microsoft.com/addons/detail/${id}`;
	const url = generateHomeURL();
	const realName = trimName(shortName ?? name);

	function generateHomeURL() {
		if (installType !== 'normal') return homepageUrl;
		return updateUrl?.startsWith('https://edge.microsoft.com')
			? edgeWebStoreUrl
			: chromeWebStoreUrl;
	}

	let contextMenuFired = false;

	function handleContextMenu(event) {
		if (!contextMenuFired) {
			contextMenuFired = true;
			oncontextmenu?.(event);
		}
	}

	function toggleExtension(event) {
		if (event.ctrlKey || event.metaKey) {
			onpin?.();
			return;
		}

		const wasEnabled = enabled;
		undoStack.do(toggle => {
			chrome.management.setEnabled(id, toggle !== wasEnabled);
		});
	}

	function onUninstallClick() {
		chrome.management.uninstall(id);
	}
</script>

<li
	class:disabled={!enabled}
	class:pinned={isPinned}
	class="ext type-{installType}"
>
	<button
		type="button"
		class="ext-name"
		onclick={toggleExtension}
		oncontextmenu={handleContextMenu}
	>
		<img alt="" src={pickBestIcon(icons, 16)} />{realName}
	</button>
	{#if optionsUrl && enabled}
		<a href={optionsUrl} title={getI18N('gotoOpt')} onclick={openInTab}>
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
			onclick={openInTab}
		>
			<img src="icons/ellipsis.svg" alt="" />
		</a>
		<button
			type="button"
			title={getI18N('uninstall')}
			onclick={onUninstallClick}
		>
			<img src="icons/bin.svg" alt="" />
		</button>
	{/if}
</li>
