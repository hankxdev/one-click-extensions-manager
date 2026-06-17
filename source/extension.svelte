<script>
	import {getPrimaryAction} from './lib/extension-actions.js';
	import pickBestIcon from './lib/icons.js';
	import {openNativePopup, PopupHelperError} from './lib/native-popup.js';
	import trimName from './lib/trim-name.js';

	const {
		id,
		name,
		shortName,
		enabled = $bindable(),
		mayDisable = true,
		mayEnable = true,
		installType,
		optionsUrl,
		icons,
		folders = [],
		folderId = '',
		folderName = '',
		showExtras = false,
		organizeMode = false,
		undoStack,
		isPinned = false,
		onfolderchange,
		onpin,
		oncontextmenu,
	} = $props();

	const getI18N = chrome.i18n.getMessage;
	// The browser will still fill the "short name" with "name" if missing.
	const realName = $derived(trimName(shortName ?? name));
	const primaryAction = $derived(getPrimaryAction({enabled, mayEnable}));
	const statusText = $derived(enabled ? 'Active' : 'Off');
	const helperText = $derived.by(() => {
		if (!enabled) {
			return mayEnable ? 'Click to enable' : 'Disabled by policy';
		}

		return primaryAction.type === 'popup'
			? 'Click to open popup'
			: 'Popup unavailable';
	});

	let busy = $state(false);
	let error = $state('');
	let removeArmed = $state(false);

	function message(key, fallback) {
		return getI18N(key) || fallback;
	}

	function getPrimaryTitle() {
		if (primaryAction.type === 'enable') {
			return message('enableExtension', 'Enable extension');
		}

		if (primaryAction.type === 'popup') {
			return message('useExtension', 'Open extension popup');
		}

		return message('extensionMenuUnavailable', 'Extension menu unavailable');
	}

	function getToggleTitle() {
		return enabled
			? message('disableExtension', 'Disable extension')
			: message('enableExtension', 'Enable extension');
	}

	function canToggle() {
		return enabled ? mayDisable : mayEnable;
	}

	function formatError(error_) {
		if (error_ instanceof PopupHelperError) {
			const detail = error_.details.join(' ');
			return detail
				? `${message(
						'nativeHelperOpenFailed',
						'Native popup helper could not open this extension popup.',
					)} ${detail}`
				: message(
						'nativeHelperMissing',
						'Native popup helper is not installed. Run native-helper/install-macos.sh from this repository.',
					);
		}

		return (
			error_?.message ||
			message('nativeHelperFailed', 'Extension action failed.')
		);
	}

	async function runAction(action) {
		if (busy) {
			return;
		}

		busy = true;
		error = '';
		try {
			await action();
		} catch (error_) {
			error = formatError(error_);
		} finally {
			busy = false;
		}
	}

	function setEnabledWithUndo(nextEnabled) {
		const previousEnabled = enabled;

		return new Promise((resolve, reject) => {
			let pending = true;
			undoStack.do(toggle => {
				const targetEnabled = toggle ? nextEnabled : previousEnabled;
				chrome.management.setEnabled(id, targetEnabled, () => {
					const failure = chrome.runtime.lastError?.message;
					if (!pending) {
						if (failure) {
							console.warn('Failed to update extension state:', failure);
						}

						return;
					}

					pending = false;
					if (failure) {
						reject(new Error(failure));
						return;
					}

					resolve();
				});
			});
		});
	}

	let contextMenuFired = false;

	function handleContextMenu(event) {
		if (!contextMenuFired) {
			contextMenuFired = true;
			oncontextmenu?.(event);
		}
	}

	function openToolbarPopup() {
		return runAction(async () => {
			if (!enabled) {
				throw new Error(
					message('extensionMenuUnavailable', 'Extension menu unavailable'),
				);
			}

			await openNativePopup({
				extensionId: id,
				extensionName: realName,
				extensionAliases: [name, shortName].filter(Boolean),
			});
		});
	}

	function handlePrimaryAction(event) {
		removeArmed = false;

		if (event.ctrlKey || event.metaKey) {
			return togglePinned();
		}

		if (primaryAction.type === 'enable') {
			return runAction(() => setEnabledWithUndo(true));
		}

		if (primaryAction.type === 'popup') {
			return openToolbarPopup();
		}

		error = message('extensionMenuUnavailable', 'Extension menu unavailable');
	}

	function runSecondaryAction(event, action) {
		event.stopPropagation();
		return action();
	}

	function handleToggleClick() {
		removeArmed = false;
		return runAction(() => setEnabledWithUndo(!enabled));
	}

	function togglePinned() {
		removeArmed = false;
		return runAction(async () => {
			await onpin?.();
		});
	}

	function handleFolderSelect(event) {
		event.stopPropagation();
		removeArmed = false;
		onfolderchange?.(event.currentTarget.value);
	}

	async function onUninstallClick() {
		if (!removeArmed) {
			error = '';
			removeArmed = true;
			return;
		}

		removeArmed = false;
		await runAction(
			() =>
				new Promise((resolve, reject) => {
					chrome.management.uninstall(id, {showConfirmDialog: true}, () => {
						const failure = chrome.runtime.lastError?.message;
						if (failure) {
							reject(new Error(failure));
							return;
						}

						resolve();
					});
				}),
		);
	}
</script>

<li
	class:disabled={!enabled}
	class:pinned={isPinned}
	class:busy
	class="ext type-{installType}"
>
	<button
		type="button"
		class="ext-main"
		oncontextmenu={handleContextMenu}
		title={getPrimaryTitle()}
		onclick={handlePrimaryAction}
		disabled={busy}
	>
		<span class="ext-icon">
			<img alt="" src={pickBestIcon(icons, 32)} />
		</span>
		<span class="ext-copy">
			<span class="ext-title-row">
				<span class="ext-name">{realName}</span>
				{#if folderName}
					<span class="ext-pill folder">{folderName}</span>
				{/if}
				{#if isPinned}
					<span class="ext-pill">Pinned</span>
				{/if}
				{#if installType === 'development'}
					<span class="ext-pill dev">Dev</span>
				{:else if installType === 'admin'}
					<span class="ext-pill admin">Admin</span>
				{/if}
			</span>
			<span class="ext-meta">
				<span class:enabled class="status-dot"></span>
				<span>{statusText}</span>
				<span class="meta-divider">/</span>
				<span>{helperText}</span>
			</span>
		</span>
	</button>

	<div class="ext-actions">
		{#if organizeMode}
			<select
				class="folder-select"
				aria-label="Move {realName} to folder"
				onchange={handleFolderSelect}
				onclick={event => {
					event.stopPropagation();
				}}
			>
				<option value="" selected={!folderId}>No folder</option>
				{#each folders as folder (folder.id)}
					<option value={folder.id} selected={folderId === folder.id}>
						{folder.name}
					</option>
				{/each}
			</select>
			<button
				type="button"
				class="mini-action"
				class:active={isPinned}
				title={isPinned ? 'Unpin from top' : 'Pin to top'}
				onclick={event => runSecondaryAction(event, togglePinned)}
				disabled={busy}
			>
				{isPinned ? 'Pinned' : 'Pin'}
			</button>
		{:else if showExtras}
			<button
				type="button"
				class="mini-action primary"
				title={message('openToolbarPopup', 'Open extension popup')}
				onclick={event => runSecondaryAction(event, openToolbarPopup)}
				disabled={busy || !enabled}
			>
				Open
			</button>
			<button
				type="button"
				class="mini-action"
				class:active={isPinned}
				title={isPinned ? 'Unpin from top' : 'Pin to top'}
				onclick={event => runSecondaryAction(event, togglePinned)}
				disabled={busy}
			>
				{isPinned ? 'Pinned' : 'Pin'}
			</button>
			{#if optionsUrl && enabled}
				<button
					type="button"
					class="icon-action"
					title={message('openToolbarPopup', 'Open extension popup')}
					onclick={event => runSecondaryAction(event, openToolbarPopup)}
					disabled={busy}
				>
					<img src="icons/options.svg" alt="" />
				</button>
			{/if}
		{/if}
		<button
			type="button"
			class="mini-action danger remove-action"
			class:armed={removeArmed}
			title={removeArmed ? 'Confirm uninstall' : 'Remove extension'}
			onclick={event => runSecondaryAction(event, onUninstallClick)}
			disabled={busy}
		>
			{removeArmed ? 'Confirm' : 'Remove'}
		</button>
		<button
			type="button"
			class="ext-toggle"
			class:enabled
			role="switch"
			aria-checked={enabled}
			aria-label={getToggleTitle()}
			title={getToggleTitle()}
			onclick={event => runSecondaryAction(event, handleToggleClick)}
			disabled={busy || !canToggle()}
		>
			<span class="ext-toggle-knob"></span>
		</button>
	</div>

	{#if error}
		<p class="ext-error">{error}</p>
	{/if}
</li>
