<script>
	import optionsStorage from './options-storage.js';
	import {onMount} from 'svelte';
	import chromeP from 'webext-polyfill-kinda';
	import Extension from './Extension.svelte';
	import UndoStack from './lib/undo-stack.js';
	import {focusNext, focusPrevious} from './lib/focus-next.js';

	const getI18N = chrome.i18n.getMessage;
	const undoStack = new UndoStack(window);

	const myid = getI18N('@@extension_id');
	let extensions = [];
	let searchValue = '';

	const options = optionsStorage.getAll();
	let showExtras = false;
	let showInfoMessage = !localStorage.getItem('undo-info-message');
	let userClickedHideInfoMessage = false; // "Disable/enable all" shows the button again, unless the user clicked already "hide" in the current session

	options.then(({showButtons, width}) => {
		if (showButtons === 'always') {
			showExtras = true;
		}

		if (new URLSearchParams(location.search).get('type') !== 'window') {
			document.body.style.width = (width || 400) + 'px';
		}
	});
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
		userClickedHideInfoMessage = true;
	}

	function keyboardNavigationHandler(event) {
		// eslint-disable-next-line unicorn/prefer-switch -- Unreadable
		if (event.key === 'Tab') {
			showExtras = true;
		} else if (event.key === 'ArrowDown') {
			focusNext('.ext-name, [type="search"]');
			event.preventDefault();
		} else if (event.key === 'ArrowUp') {
			focusPrevious('.ext-name, [type="search"]');
			event.preventDefault();
		} else {
			return;
		}

		document.body.classList.add('keyboard-navigation');
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

	function handleBurger() {
		switch (this.value) {
			case 'enable': {
				toggleAll(true);
				showInfoMessage = true;
				break;
			}

			case 'disable': {
				toggleAll(false);
				showInfoMessage = true;
				break;
			}

			case 'extensions': {
				chrome.tabs.create({url: 'chrome://extensions'});
				break;
			}

			default:
		}

		this.value = ''; // Reset the select. PreventDefault doesn't work
	}
</script>

<svelte:window on:keydown={keyboardNavigationHandler} />
<main>
	{#if showInfoMessage && !userClickedHideInfoMessage}
		<p class="notice">
			{@html getI18N('undoInfoMsg')}
			<a class="hide-action" href="#hide" on:click={hideInfoMessage}
				>{getI18N('hideInfoMsg')}</a
			>
		</p>
	{/if}
	<div class="header">
		<!-- svelte-ignore a11y-autofocus -->
		<input
			autofocus
			placeholder={getI18N('searchTxt')}
			bind:value={searchValue}
			type="search"
		/>
		<select class="header-burger" on:change={handleBurger}>
			<option value="">…</option>
			<option value="extensions">{getI18N('manage')}</option>
			<option value="disable">{getI18N('disAll')}</option>
			<option value="enable">{getI18N('enableAll')}</option>
		</select>
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
