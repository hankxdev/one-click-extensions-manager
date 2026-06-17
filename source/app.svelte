<script>
	import {onMount} from 'svelte';
	import Extension from './extension.svelte';
	import {replaceModifierIfMac} from './lib/cmd-key.js';
	import {focusNext, focusPrevious} from './lib/focus-next.js';
	import prepareExtensionList from './lib/prepare-extension-list.js';
	import UndoStack from './lib/undo-stack.js';
	import optionsStorage, {
		assignExtensionFolder,
		createExtensionFolder,
		deleteExtensionFolder,
		removeExtensionPreferences,
		togglePin,
	} from './options-storage.js';

	const allFolderId = 'all';
	const noFolderId = 'unfiled';
	const getI18N = chrome.i18n.getMessage;
	const undoStack = new UndoStack(globalThis);
	const statusFilters = [
		{label: 'All', mode: 'all'},
		{label: 'On', mode: 'enabled'},
		{label: 'Off', mode: 'disabled'},
	];

	let activeFolderId = $state(allFolderId);
	let controlsExpanded = $state(false);
	let deleteFolderArmed = $state(false);
	let extensions = $state([]);
	let filterMode = $state('all');
	let folders = $state([]);
	let newFolderName = $state('');
	let organizeMode = $state(false);
	let searchValue = $state('');
	let showExtras = $state(false);
	let showStickyInfoMessage = $state(
		!localStorage.getItem('sticky-info-message'),
	);
	let showInfoMessage = $state(!localStorage.getItem('undo-info-message'));

	const extensionStats = $derived.by(() => {
		const total = extensions.length;
		const active = extensions.filter(({enabled}) => enabled).length;

		return {
			active,
			disabled: total - active,
			total,
		};
	});

	const visibleExtensions = $derived.by(() => {
		const keywords = searchValue
			.toLowerCase()
			.split(' ')
			.filter(s => s.length);

		return extensions
			.filter(extension =>
				keywords.every(word => extension.indexedName.includes(word)),
			)
			.filter(extension => {
				if (filterMode === 'enabled') {
					return extension.enabled;
				}

				if (filterMode === 'disabled') {
					return !extension.enabled;
				}

				return true;
			})
			.filter(extension => {
				if (activeFolderId === noFolderId) {
					return !extension.folderId;
				}

				if (activeFolderId !== allFolderId) {
					return extension.folderId === activeFolderId;
				}

				return true;
			});
	});

	const folderSections = $derived.by(() => {
		if (activeFolderId !== allFolderId) {
			return [
				{
					id: activeFolderId,
					name: getFolderLabel(activeFolderId),
					extensions: visibleExtensions,
				},
			];
		}

		const sections = folders
			.map(folder => ({
				...folder,
				extensions: visibleExtensions.filter(
					extension => extension.folderId === folder.id,
				),
			}))
			.filter(
				({extensions: sectionExtensions}) => sectionExtensions.length > 0,
			);
		const unfiled = visibleExtensions.filter(
			({folderId: extensionFolderId}) => !extensionFolderId,
		);

		if (unfiled.length > 0) {
			sections.push({
				id: noFolderId,
				name: 'No folder',
				extensions: unfiled,
			});
		}

		return sections.length > 0
			? sections
			: [
					{
						id: allFolderId,
						name: 'All extensions',
						extensions: visibleExtensions,
					},
				];
	});

	let userClickedHideInfoMessage = $state(false);

	optionsStorage.getAll().then(({showButtons, width, position}) => {
		if (showButtons === 'always') {
			showExtras = true;
		}

		if (position === 'popup' || position === 'window') {
			document.documentElement.style.width = `${width || 500}px`;
		}
	});

	function message(key, fallback) {
		return getI18N(key) || fallback;
	}

	function getFolderLabel(selectedFolderId) {
		if (selectedFolderId === noFolderId) {
			return 'No folder';
		}

		if (selectedFolderId === allFolderId) {
			return 'All extensions';
		}

		return folders.find(({id}) => id === selectedFolderId)?.name ?? 'Folder';
	}

	function getFolderCount(selectedFolderId) {
		if (selectedFolderId === allFolderId) {
			return extensions.length;
		}

		if (selectedFolderId === noFolderId) {
			return extensions.filter(extension => !extension.folderId).length;
		}

		return extensions.filter(
			extension => extension.folderId === selectedFolderId,
		).length;
	}

	function getFilterCount(mode) {
		if (mode === 'enabled') {
			return extensionStats.active;
		}

		if (mode === 'disabled') {
			return extensionStats.disabled;
		}

		return extensionStats.total;
	}

	function hideInfoMessage() {
		localStorage.setItem('undo-info-message', Date.now());
		showInfoMessage = false;
		userClickedHideInfoMessage = true;
	}

	function hideStickyInfoMessage() {
		localStorage.setItem('sticky-info-message', Date.now());
		showStickyInfoMessage = false;
	}

	function keyboardNavigationHandler(event) {
		switch (event.key) {
			case 'Tab': {
				showExtras = true;
				break;
			}

			case 'ArrowDown': {
				focusNext('.ext-main, [type="search"]');
				event.preventDefault();
				break;
			}

			case 'ArrowUp': {
				focusPrevious('.ext-main, [type="search"]');
				event.preventDefault();
				break;
			}

			default: {
				return;
			}
		}

		document.body.classList.add('keyboard-navigation');
	}

	function toggleAll(enable) {
		const affectedExtensions = extensions.filter(
			extension =>
				enable !== extension.enabled &&
				(enable
					? extension.mayEnable !== false
					: extension.mayDisable !== false),
		);

		undoStack.do(toggle => {
			for (const extension of affectedExtensions) {
				chrome.management.setEnabled(
					extension.id,
					enable ? toggle : !toggle,
					() => {
						const failure = chrome.runtime.lastError?.message;
						if (failure) {
							console.warn('Failed to update extension state:', failure);
						}
					},
				);
			}
		});
	}

	function handleBulkAction(enable) {
		toggleAll(enable);
		showInfoMessage = true;
	}

	function handleUninstalled(deletedExtensionId) {
		extensions = extensions.filter(({id}) => id !== deletedExtensionId);
		removeExtensionPreferences(deletedExtensionId).catch(error => {
			console.warn('Failed to clean up extension preferences:', error);
		});
	}

	async function handleInstalled(installed) {
		if (installed.type === 'extension') {
			prepare();
		}
	}

	function handleEnabled(updated) {
		const extension = extensions.find(({id}) => id === updated.id);
		if (!extension) {
			return;
		}

		extension.enabled = true;
	}

	function handleDisabled(updated) {
		const extension = extensions.find(({id}) => id === updated.id);
		if (!extension) {
			return;
		}

		extension.enabled = false;
	}

	async function prepare() {
		const options = await optionsStorage.getAll();
		folders = options.extensionFolders;
		extensions = await prepareExtensionList(await chrome.management.getAll());

		if (
			activeFolderId !== allFolderId &&
			activeFolderId !== noFolderId &&
			!folders.some(({id}) => id === activeFolderId)
		) {
			activeFolderId = allFolderId;
		}
	}

	async function handlePin(extensionId) {
		const wasPinned = await togglePin(extensionId);
		await prepare();
		return wasPinned;
	}

	async function handleFolderChange(extensionId, folderId) {
		await assignExtensionFolder(extensionId, folderId);
		await prepare();
	}

	function selectFolder(folderId) {
		activeFolderId = folderId;
		deleteFolderArmed = false;
	}

	async function handleCreateFolder() {
		const name = newFolderName.trim();
		if (!name) {
			return;
		}

		const folder = await createExtensionFolder(name);
		newFolderName = '';
		activeFolderId = folder.id;
		deleteFolderArmed = false;
		organizeMode = true;
		await prepare();
	}

	async function handleDeleteFolder() {
		if (!deleteFolderArmed) {
			deleteFolderArmed = true;
			return;
		}

		await deleteExtensionFolder(activeFolderId);
		activeFolderId = allFolderId;
		deleteFolderArmed = false;
		await prepare();
	}

	function clearSearch() {
		searchValue = '';
		document.querySelector('[type="search"]')?.focus();
	}

	onMount(async () => {
		await prepare();

		chrome.management.onUninstalled.addListener(handleUninstalled);
		chrome.management.onInstalled.addListener(handleInstalled);
		chrome.management.onEnabled.addListener(handleEnabled);
		chrome.management.onDisabled.addListener(handleDisabled);
		window.addEventListener('blur', prepare);

		return () => {
			chrome.management.onUninstalled.removeListener(handleUninstalled);
			chrome.management.onInstalled.removeListener(handleInstalled);
			chrome.management.onEnabled.removeListener(handleEnabled);
			chrome.management.onDisabled.removeListener(handleDisabled);
			window.removeEventListener('blur', prepare);
		};
	});

	function onContextMenu(event) {
		if (!showExtras) {
			showExtras = true;
			event.preventDefault();
		}
	}
</script>

<svelte:window onkeydown={keyboardNavigationHandler} />
<main class="app-shell">
	<header class="topbar">
		<div class="brand-block">
			<img
				class="brand-logo"
				src="onfire-logo.svg"
				alt=""
				width="34"
				height="34"
				aria-hidden="true"
			/>
			<div>
				<p class="brand-label">OnFire Extensions Manager</p>
				<h1>Extensions</h1>
				<p>
					{extensionStats.total} total, {extensionStats.active} active,
					{folders.length} folders
				</p>
			</div>
		</div>
		<button
			type="button"
			class="organize-toggle"
			class:active={organizeMode}
			aria-pressed={organizeMode}
			onclick={() => {
				organizeMode = !organizeMode;
				if (organizeMode) {
					controlsExpanded = true;
				}

				deleteFolderArmed = false;
			}}
		>
			{organizeMode ? 'Done' : 'Organize'}
		</button>
	</header>

	{#if showInfoMessage && !userClickedHideInfoMessage}
		<p class="notice">
			<span>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- Static -->
				{@html replaceModifierIfMac(getI18N('undoInfoMsg'), 'z')}
			</span>
			<a class="hide-action" href="#hide" onclick={hideInfoMessage}
				>{getI18N('hideInfoMsg')}</a
			>
		</p>
	{/if}
	{#if showStickyInfoMessage}
		<p class="notice">
			<span>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- Static -->
				{@html replaceModifierIfMac(getI18N('stickyInfoMsg'), '')}
			</span>
			<a class="hide-action" href="#hide" onclick={hideStickyInfoMessage}
				>{getI18N('hideInfoMsg')}</a
			>
		</p>
	{/if}

	<section class="control-panel" aria-label="Extension controls">
		<button
			type="button"
			class="panel-summary"
			aria-expanded={controlsExpanded}
			aria-controls="extension-controls"
			onclick={() => {
				controlsExpanded = !controlsExpanded;
			}}
		>
			<span>
				<strong>Search and filters</strong>
				<small>{visibleExtensions.length} shown</small>
			</span>
			<span class="dropdown-arrow" aria-hidden="true"></span>
		</button>

		{#if controlsExpanded}
			<div id="extension-controls" class="control-panel-body">
				<div class="search-row">
					<label class="search-box">
						<span class="search-label">Search</span>
						<!-- svelte-ignore a11y_autofocus -->
						<input
							autofocus
							placeholder={message('searchTxt', 'Search by name...')}
							bind:value={searchValue}
							type="search"
						/>
					</label>
					{#if searchValue}
						<button type="button" class="clear-search" onclick={clearSearch}>
							Clear
						</button>
					{/if}
				</div>

				<div class="status-tabs" role="tablist" aria-label="Filter by status">
					{#each statusFilters as filter (filter.mode)}
						<button
							type="button"
							role="tab"
							class:active={filterMode === filter.mode}
							aria-selected={filterMode === filter.mode}
							onclick={() => {
								filterMode = filter.mode;
							}}
						>
							<span>{filter.label}</span>
							<small>{getFilterCount(filter.mode)}</small>
						</button>
					{/each}
				</div>

				<div class="folder-strip" aria-label="Extension folders">
					<button
						type="button"
						class:active={activeFolderId === allFolderId}
						onclick={() => {
							selectFolder(allFolderId);
						}}
					>
						<span>All</span>
						<small>{getFolderCount(allFolderId)}</small>
					</button>
					<button
						type="button"
						class:active={activeFolderId === noFolderId}
						onclick={() => {
							selectFolder(noFolderId);
						}}
					>
						<span>No folder</span>
						<small>{getFolderCount(noFolderId)}</small>
					</button>
					{#each folders as folder (folder.id)}
						<button
							type="button"
							class:active={activeFolderId === folder.id}
							onclick={() => {
								selectFolder(folder.id);
							}}
						>
							<span>{folder.name}</span>
							<small>{getFolderCount(folder.id)}</small>
						</button>
					{/each}
				</div>

				{#if organizeMode}
					<div class="organize-panel">
						<form
							class="folder-form"
							onsubmit={event => {
								event.preventDefault();
								handleCreateFolder();
							}}
						>
							<input
								placeholder="New folder"
								bind:value={newFolderName}
								aria-label="New folder name"
							/>
							<button type="submit">Add</button>
						</form>
						<div class="bulk-actions">
							<button type="button" onclick={() => handleBulkAction(true)}>
								Enable all
							</button>
							<button type="button" onclick={() => handleBulkAction(false)}>
								Disable all
							</button>
							{#if activeFolderId !== allFolderId && activeFolderId !== noFolderId}
								<button
									type="button"
									class="danger"
									onclick={handleDeleteFolder}
								>
									{deleteFolderArmed ? 'Confirm delete' : 'Delete folder'}
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</section>

	{#if visibleExtensions.length === 0}
		<section class="empty-state" aria-live="polite">
			<h2>No extensions found</h2>
			<p>Try another search or choose another folder.</p>
		</section>
	{:else}
		<section class="extension-groups" aria-label="Extension list">
			{#each folderSections as section (section.id)}
				<div class="section-heading">
					<h2>{section.name}</h2>
					<span>{section.extensions.length}</span>
				</div>
				<ul class="ext-list">
					{#each section.extensions as extension (extension.id)}
						<Extension
							{...extension}
							bind:enabled={extension.enabled}
							{folders}
							{showExtras}
							{organizeMode}
							oncontextmenu={onContextMenu}
							onfolderchange={folderId =>
								handleFolderChange(extension.id, folderId)}
							onpin={() => handlePin(extension.id)}
							{undoStack}
						/>
					{/each}
				</ul>
			{/each}
		</section>
	{/if}
</main>
