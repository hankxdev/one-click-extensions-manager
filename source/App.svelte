<script>
	import {onMount} from 'svelte';
	import chromeP from 'webext-polyfill-kinda';
	import Extension from './Extension.svelte';
	import openInTab from './lib/open-in-tab.js';
	import UndoStack from './lib/undo-stack.js';

	const getI18N = chrome.i18n.getMessage;
	const undoStack = new UndoStack(window);

	const myid = getI18N('@@extension_id');
	let extensions = [];
	let searchValue = '';

	// Show all buttons when it's not in a popup #32
	let showExtras =
		new URLSearchParams(window.location.search).get('type') !== 'popup';
	let showInfoMessage = !localStorage.getItem('undo-info-message');

	$: {
		const keywords = searchValue
			.toLowerCase()
			.split(' ')
			.filter(s => s.length);
		for (const extension of extensions) {
			extension.shown = keywords.every(word =>
				extension.indexedName.includes(word)
			);
		}

		extensions = extensions; // Signals to Svelte that the content was updated
	}

	function hideInfoMessage() {
		localStorage.setItem('undo-info-message', 1);
		showInfoMessage = false;
	}

	function keyboardNavigationHandler(event) {
		if (event.key === 'Tab') {
			document.body.classList.add('keyboard-navigation');
			showExtras = true;
		}
	}

	function toggleAll(enable) {
		const affectedExtensions = extensions.filter(
			extension => enable !== extension.enabled
		);

		undoStack.do(toggle => {
			for (const extension of affectedExtensions) {
				extension.enabled = enable ? toggle : !toggle;
				chrome.management.setEnabled(extension.id, extension.enabled);
			}

			extensions = extensions; // Signals to Svelte that the content was updated
		});
	}

	onMount(async () => {
		const allExtensions = await chromeP.management.getAll();
		extensions = allExtensions
			.filter(({type, id}) => type === 'extension' && id !== myid)
			.sort((a, b) => {
				if (a.enabled === b.enabled) {
					return a.name.localeCompare(b.name); // Sort by name
				}

				return a.enabled < b.enabled ? 1 : -1; // Sort by state
			})
			.map(extension => {
				extension.shown = true;
				extension.indexedName = extension.name.toLowerCase();
				return extension;
			});

		// Update list on uninstall
		chrome.management.onUninstalled.addListener(deleted => {
			extensions = extensions.filter(({id}) => id !== deleted);
		});
	});

	// Toggle extra buttons on right click on the name
	let onContextMenu;
	$: onContextMenu = event => {
		showExtras = !showExtras;
		event.preventDefault();
	};
</script>

<svelte:window on:keydown={keyboardNavigationHandler} />

<main>
	{#if showInfoMessage}
		<p>
			{@html getI18N('undoInfoMsg')}
			<a class="hide-action" href="#hide" on:click={hideInfoMessage}>{getI18N('hideInfoMsg')}</a>
		</p>
	{/if}
	<!-- svelte-ignore a11y-autofocus -->
	<input
		autofocus
		placeholder={getI18N('searchTxt')}
		bind:value={searchValue}
		type="search"
	/>
	<div class="options">
		<button on:click={() => toggleAll(false)}>{getI18N('disAll')}</button>
		<button on:click={() => toggleAll(true)}>{getI18N('enableAll')}</button>
		<a href="chrome://extensions" on:click={openInTab} title={getI18N('manage')}
			>{getI18N('extensionPage')}</a
		>
	</div>
	<ul id="ext-list">
		{#each extensions as extension (extension.id)}
			{#if extension.shown}
				<Extension
					{...extension}
					bind:enabled={extension.enabled}
					bind:showExtras
					on:contextmenu={onContextMenu}
					{undoStack}
				/>
			{/if}
		{/each}
	</ul>
</main>
