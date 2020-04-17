<script>
	import {onMount} from 'svelte';
	import Extension from './Extension.svelte';
	import UndoStack from './lib/undo-stack';

	const undoStack = new UndoStack(window);

	const cme = chrome.management;
	const getI18N = chrome.i18n.getMessage;
	const myid = getI18N('@@extension_id');

	export let extensions = [];
	let searchField;
	let showExtras = new URLSearchParams(location.search).get('type') !== 'popup'
	let searchValue = '';
	let showInfoMessage = !localStorage.getItem('undo-info-message');

	function hideInfoMessage() {
		localStorage.setItem('undo-info-message', 1);
		showInfoMessage = false;
	}

	function toggleAll(enable) {
		const affectedExtensions = extensions.filter(extension => enable !== extension.enabled);

		undoStack.do(toggle => {
			for (const extension of affectedExtensions) {
				extension.enabled = enable ? toggle : !toggle;
				cme.setEnabled(extension.id, extension.enabled);
			}

			extensions = extensions;
		});
	}

	onMount(async () => {
		searchField.focus();
		window.scrollTo(0, 0); // Fix overscroll caused by autofocus

		extensions = (await browser.management.getAll())
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
		cme.onUninstalled.addListener(deleted => {
			extensions = extensions.filter(({id}) => id !== deleted);
		});
	});

	// Show extra buttons on right click on the name
	function onContextMenu(event) {
		showExtras = true;
		event.preventDefault();
	}

	function onSearchInput() {
		const keywords = this.value.toLowerCase().split(' ').filter(s => s.length);
		for (const extension of extensions) {
			extension.shown = keywords.every(word => extension.indexedName.includes(word));
		}

		extensions = extensions;
	}
</script>

<main>
	{#if showInfoMessage}
		<p>{getI18N('undoInfoMsg')} <a href="#hide" on:click={hideInfoMessage}>{getI18N('hideInfoMsg')}</a></p>
	{/if}
	<input bind:this={searchField} placeholder={getI18N('searchTxt')} bind:value={searchValue} on:input={onSearchInput}>
	<div class="options">
		<button on:click={() => toggleAll(false)}>{getI18N('disAll')}</button>
		<button on:click={() => toggleAll(true)}>{getI18N('enableAll')}</button>
		<a href="chrome://extensions">{getI18N('extensionPage')}</a>
	</div>
	<ul id="extList">
		{#each extensions as extension (extension.id)}
			{#if extension.shown}
				<Extension {...extension} bind:enabled={extension.enabled} bind:showExtras on:contextmenu|once={onContextMenu} {undoStack}/>
			{/if}
		{/each}
	</ul>
</main>
