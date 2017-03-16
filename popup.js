const cme = chrome.management;
const getI18N = chrome.i18n.getMessage;
const myid = getI18N('@@extension_id');

// Handle undo/redo events
const undoStack = new UndoStack(document.body);

/**
 * GENERATE PAGE
 */
const $searchField = $(`<input placeholder="${ getI18N('searchTxt') }">`);
const eul = $('<ul id="extList">');
const $options = $('<div class="options">');
const $disableAllButton = $(`<button>${ getI18N('disAll') }</button>`);
const $extensionPageButton = $(`<button>${ getI18N('extensionPage') }</button>`);

if (!localStorage.getItem('undo-info-message')) {
	const $undoInfoMessage = $(`<p>${ getI18N('undoInfoMsg')} </p>`);
	const $hideInfoMessage = $(`<a href="#hide">${ getI18N('hideInfoMsg') }</a>`);
	$undoInfoMessage.append($hideInfoMessage);
	$('body').append($undoInfoMessage);
	$hideInfoMessage.click(() => {
		localStorage.setItem('undo-info-message', 1);
		$undoInfoMessage.slideUp(300);
	});
}

$options
	.append($disableAllButton)
	.append($extensionPageButton);

$('body')
	.append($searchField)
	.append($options)
	.append(eul);

$searchField.focus();
window.scrollTo(0, 0); // fix overscroll caused by autofocus

// Generate extension list
cme.getAll(ets => {
	const listHTML = ets
	.filter(ext => !ext.isApp && ext.id !== myid)
	.sort((a, b) => {
		if (a.enabled === b.enabled) {
			return a.name.localeCompare(b.name); // sort by name
		}
		return a.enabled < b.enabled ? 1 : -1; // sort by state
	})
	.map(createList);
	$(listHTML.join('')).appendTo(eul);
});

/**
 * EVENT LISTENERS
 */

// Toggle on click
eul.on('click', '.extName', e => {
	const $extension = $(e.currentTarget).parent();
	const id = $extension.attr('id');
	const wasEnabled = !$extension.hasClass('disabled');
	const toggle = enabled => {
		cme.setEnabled(id, enabled, () => {
			$extension.toggleClass('disabled', !enabled);
			$extension.find('.extName').attr('title', getI18N(enabled ? 'clkDisable' : 'clkEnable'));
		});
	}

	undoStack.do(() => {
		toggle(!wasEnabled);
	}, () => {
		toggle(wasEnabled);
	});
});

// Uninstall on right click
eul.on('contextmenu', '.ext', e => false);
eul.on('mouseup', '.ext', e => {
	if (e.which == 3) {
		cme.uninstall(e.currentTarget.id);
	}
});

// Enable filtering
$searchField.on('input', function () {
	const extensions = $('#extList li');
	const keywords = this.value.split(' ').filter(s => s.length);
	const hiddenExtensions = extensions.not((i, el) => {
		return keywords.every(word => el.dataset.name.includes(word));
	});
	hiddenExtensions.hide();
	extensions.not(hiddenExtensions).show();
});

// Enable general buttons
$disableAllButton.click(disableAll);
$extensionPageButton.click(() => {
	chrome.tabs.create({url: 'chrome://extensions'});
});

// Update list on uninstall
cme.onUninstalled.addListener(id => {
	$(`#${id}`).remove();
});

/**
 * FUNCTIONS
 */
function getIcon(icons, size = 16) {
	// Set fallback icon
	let selectedIcon = chrome.extension.getURL('icon-puzzle.svg');

	// Get retina size if necessary
	size *= window.devicePixelRatio;

	if (icons && icons.length) {
		// Get a large icon closest to the desired size
		icons.reverse().some(icon => {
			if (icon.size < size) {
				return false;
			}
			selectedIcon = icon.url;
		});
	}
	return selectedIcon;
}

function createList(e) {
	return `
		<li class='ext ${e.enabled ? '' : 'disabled'} type-${e.installType}' id='${e.id}' data-name="${e.name.toLowerCase()}">
			<span class='extName' title='${getI18N('toggleEnable')}'>
				<img class='extIcon' src='${getIcon(e.icons, 16)}'>
				${e.name}
			</span>
			${
				e.optionsUrl ? `
					<a class='extOptions' href='${e.optionsUrl}' title='${getI18N('gotoOpt')}' target='_blank'>
						<img src="${chrome.extension.getURL('icon-options.svg')}">
					</a>
				` : ``
			}
		</li>
	`;
}

function disableAll() {
	cme.getAll(ets => {
		const wereEnabled = ets.filter(ext => ext.enabled && ext.id !== myid);
		const selector = wereEnabled.map(ext => '#' + ext.id).join(',');
		const $wereEnabled = $(selector);

		undoStack.do(disable => {
			wereEnabled.forEach(extension => {
				cme.setEnabled(extension.id, !disable);
			});
			$wereEnabled.toggleClass('disabled', disable)
		});
	});
}
