<script>
	import optionsStorage from './options-storage.js';
	import {onMount} from 'svelte';
	import chromeP from 'webext-polyfill-kinda';
	import Extension from './extension.svelte';
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

		// eslint-disable-next-line no-self-assign -- Signals to Svelte that the content was updated
		extensions = extensions;
	}


	function fillInTheBlanks(extension) {
				extension.shown = true;
				extension.indexedName = extension.name.toLowerCase();
				return extension;
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

			// eslint-disable-next-line no-self-assign -- Signals to Svelte that the content was updated
			extensions = extensions;
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
			.map(extension => fillInTheBlanks(extension));

		// Update list on global events
		chrome.management.onUninstalled.addListener(deleted => {
			extensions = extensions.filter(({id}) => id !== deleted);
		});
		chrome.management.onInstalled.addListener(installed => {
			if (installed.type === 'extension') {
				// Place new extension at the top
				extensions = [fillInTheBlanks(installed), ...extensions];
			}
		});
	});

	// Toggle extra buttons on right click on the name
	// After the first click, allow the native context menu
	let onContextMenu;
	$: onContextMenu = event => {
		if (!showExtras) {
			showExtras = true;
			event.preventDefault();
		}
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

			case 'options': {
				chrome.runtime.openOptionsPage();
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
			<option value="options">{getI18N('gotoOpt')}</option>
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
					on:contextmenu|once={onContextMenu}
					{undoStack}
				/>
			{/if}
		{/each}
	</ul>
</main>
