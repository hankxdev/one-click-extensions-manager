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
		showExtras = $bindable(),
		undoStack,
		isPinned = false,
		onpin,
		oncontextmenu,
	} = $props();

	const getI18N = chrome.i18n.getMessage;
	// The browser will still fill the "short name" with "name" if missing
	const realName = $derived(trimName(shortName ?? name));
	const primaryAction = $derived(getPrimaryAction({enabled, mayEnable}));

	let busy = $state(false);
	let error = $state('');

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
		// Check if Ctrl/Cmd is held down for pinning
		if (event.ctrlKey || event.metaKey) {
			onpin?.();
			return;
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

	function isInteractiveChildEvent(event) {
		return (
			event.target !== event.currentTarget &&
			Boolean(event.target.closest?.('button, a, input, select, textarea'))
		);
	}

	function handleRowKeydown(event) {
		if (isInteractiveChildEvent(event)) {
			return;
		}

		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}

		event.preventDefault();
		return handlePrimaryAction(event);
	}

	function handleToggleClick() {
		return runAction(() => setEnabledWithUndo(!enabled));
	}

	function onUninstallClick() {
		return runAction(
			() =>
				new Promise((resolve, reject) => {
					chrome.management.uninstall(id, () => {
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

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<li
	class:disabled={!enabled}
	class:pinned={isPinned}
	class="ext type-{installType}"
	role="button"
	tabindex={busy ? -1 : 0}
	onclick={handlePrimaryAction}
	onkeydown={handleRowKeydown}
>
	<button
		type="button"
		class="ext-name"
		oncontextmenu={handleContextMenu}
		title={getPrimaryTitle()}
		disabled={busy}
	>
		<img alt="" src={pickBestIcon(icons, 16)} />{realName}
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
	{#if showExtras}
		{#if optionsUrl && enabled}
			<button
				type="button"
				title={message('openToolbarPopup', 'Open extension popup')}
				onclick={event => runSecondaryAction(event, openToolbarPopup)}
				disabled={busy}
			>
				<img src="icons/options.svg" alt="" />
			</button>
		{/if}
		<button
			type="button"
			title={message('openToolbarPopup', 'Open extension popup')}
			onclick={event => runSecondaryAction(event, openToolbarPopup)}
			disabled={busy || !enabled}
		>
			<img src="icons/ellipsis.svg" alt="" />
		</button>
		<button
			type="button"
			title={getI18N('uninstall')}
			onclick={event => runSecondaryAction(event, onUninstallClick)}
			disabled={busy}
		>
			<img src="icons/bin.svg" alt="" />
		</button>
	{/if}
	{#if error}
		<p class="ext-error">{error}</p>
	{/if}
</li>
