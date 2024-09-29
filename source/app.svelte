<script>
	import {onMount} from 'svelte';
	import Extension from './extension.svelte';
	import {focusNext, focusPrevious} from './lib/focus-next.js';
	import prepareExtensionList from './lib/prepare-extension-list.js';
	import UndoStack from './lib/undo-stack.js';
	import optionsStorage from './options-storage.js';

	const getI18N = chrome.i18n.getMessage;
	const undoStack = new UndoStack(window);

	let extensions = [];
	let searchValue = '';

	const options = optionsStorage.getAll();
	let showExtras = false;
	let showInfoMessage = !localStorage.getItem('undo-info-message');
	let userClickedHideInfoMessage = false; // "Disable/enable all" shows the button again, unless the user clicked already "hide" in the current session

	options.then(({showButtons, width, position}) => {
		if (showButtons === 'always') {
			showExtras = true;
		}

		if (position === 'popup' || position === 'window') {
			document.documentElement.style.width = `${width || 400}px`;
		}
	});
	$: {
		const keywords = searchValue
			.toLowerCase()
			.split(' ')
			.filter(s => s.length);
		for (const extension of extensions) {
			extension.shown = keywords.every(word =>
				extension.indexedName.includes(word),
			);
		}

		extensions = extensions;
	}

	function hideInfoMessage() {
		localStorage.setItem('undo-info-message', 1);
		showInfoMessage = false;
		userClickedHideInfoMessage = true;
	}

	function keyboardNavigationHandler(event) {
		switch (event.key) {
			case 'Tab':
				showExtras = true;
				break;

			case 'ArrowDown':
				focusNext('.ext-name, [type="search"]');
				event.preventDefault();
				break;

			case 'ArrowUp':
				focusPrevious('.ext-name, [type="search"]');
				event.preventDefault();
				break;

			default:
				return;
		}

		document.body.classList.add('keyboard-navigation');
	}

	function toggleAll(enable) {
		const affectedExtensions = extensions.filter(
			extension => enable !== extension.enabled,
		);

		undoStack.do(toggle => {
			for (const extension of affectedExtensions) {
				chrome.management.setEnabled(extension.id, enable ? toggle : !toggle);
			}
		});
	}

	function handleUninstalled(deleted) {
		extensions = extensions.filter(({id}) => id !== deleted);
	}

	async function handleInstalled(installed) {
		if (installed.type === 'extension') {
			extensions = prepareExtensionList(await chrome.management.getAll());
		}
	}

	function handleEnabled(updated) {
		const extension = extensions.find(({id}) => id === updated.id);
		extension.enabled = true;
		extensions = extensions;
	}

	function handleDisabled(updated) {
		const extension = extensions.find(({id}) => id === updated.id);
		extension.enabled = false;
		extensions = extensions;
	}

	async function prepare() {
		extensions = prepareExtensionList(await chrome.management.getAll());
	}

	onMount(async () => {
		await prepare();

		// Add listeners
		chrome.management.onUninstalled.addListener(handleUninstalled);
		chrome.management.onInstalled.addListener(handleInstalled);
		chrome.management.onEnabled.addListener(handleEnabled);
		chrome.management.onDisabled.addListener(handleDisabled);
		window.addEventListener('blur', prepare);

		// Cleanup function
		return () => {
			chrome.management.onUninstalled.removeListener(handleUninstalled);
			chrome.management.onInstalled.removeListener(handleInstalled);
			chrome.management.onEnabled.removeListener(handleEnabled);
			chrome.management.onDisabled.removeListener(handleDisabled);
			window.removeEventListener('blur', prepare);
		};
	});

	// Toggle extra buttons on right click on the name
	// After the first click, allow the native context menu
	function onContextMenu(event) {
		if (!showExtras) {
			showExtras = true;
			event.preventDefault();
		}
	}

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
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- Static -->
			{@html UndoStack.replaceKbdOnMac(getI18N('undoInfoMsg'))}
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
