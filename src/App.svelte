<script>
	import { onMount } from 'svelte';
	import Extension from './Extension.svelte';

	const cme = chrome.management;
	const getI18N = chrome.i18n.getMessage;
	const myid = getI18N('@@extension_id');

	export let extensions = [];
	let searchField;
	let optionsShown
	let showExtras = false;
	let searchValue = '';

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
			.forEach(extension => {
				extension.shown = true;
				extension.indexedName = extension.name.toLowerCase();
			});
	});

	// Show extra buttons on right click on the name
	function onContextMenu(event) {
		showExtras = true;
	}

	function onSearchInput(event) {
		const keywords = this.value.toLowerCase().split(' ').filter(s => s.length);
		for (const extension of extensions) {
			extension.shown = keywords.every(word => extension.indexedName.includes(word));
		}
	}
</script>

<main>
	<p>{getI18N('undoInfoMsg')} <a href="#hide">{getI18N('hideInfoMsg')}</a></p>
	<input bind:this={searchField} placeholder={getI18N('searchTxt')} bind:value={searchValue} on:input={onSearchInput}>
	<div class="options">
		<button>{getI18N('disAll')}</button>
		<button>{getI18N('enableAll')}</button>
		<a href="chrome://extensions">{getI18N('extensionPage')}</a>
	</div>
	<ul id="extList">
		{#each extensions as extension (extension.id)}
			{#if extension.shown}
				<Extension {...extension} {showExtras} on:contextmenu|once={onContextMenu}/>
			{/if}
		{/each}
	</ul>
</main>