/* global UndoStack */

const cme = chrome.management;
const getI18N = chrome.i18n.getMessage;
const myid = getI18N('@@extension_id');

// Handle undo/redo events
const undoStack = new UndoStack(document.body);

const escapeCssId = id => id.replace(/[@.]/g, '\\$0');

/**
 * GENERATE PAGE
 */
const $searchField = $(`<input placeholder="${getI18N('searchTxt')}">`);
const eul = $('<ul id="extList">');
const $options = $('<div class="options">');
const $disableAllButton = $(`<button>${getI18N('disAll')}</button>`);
const $enableAllButton = $(`<button>${getI18N('enableAll')}</button>`);
const $extensionPageButton = $(`<a href="chrome://extensions">${getI18N('extensionPage')}</a>`);

if (!localStorage.getItem('undo-info-message')) {
	const $undoInfoMessage = $(`<p>${getI18N('undoInfoMsg')} </p>`);
	const $hideInfoMessage = $(`<a href="#hide">${getI18N('hideInfoMsg')}</a>`);
	$undoInfoMessage.append($hideInfoMessage);
	$('body').append($undoInfoMessage);
	$hideInfoMessage.click(() => {
		localStorage.setItem('undo-info-message', 1);
		$undoInfoMessage.hide();
	});
}

$options
	.append($disableAllButton)
	.append($enableAllButton)
	.append($extensionPageButton);

$('body')
	.append($searchField)
	.append($options)
	.append(eul);

$searchField.focus();
window.scrollTo(0, 0); // Fix overscroll caused by autofocus

// Generate extension list
getExtensions(extensions => {
	const listHTML = extensions
		.sort((a, b) => {
			if (a.enabled === b.enabled) {
				return a.name.localeCompare(b.name); // Sort by name
			}

			return a.enabled < b.enabled ? 1 : -1; // Sort by state
		})
		.map(createList);
	$(listHTML.join('')).appendTo(eul);
});

/**
 * EVENT LISTENERS
 */

// Toggle on click
eul.on('click', '.extName', evt => {
	const $extension = $(evt.currentTarget).parent();
	const id = $extension.attr('id');
	const wasEnabled = !$extension.hasClass('disabled');
	const toggle = enabled => {
		cme.setEnabled(id, enabled, () => {
			$extension.toggleClass('disabled', !enabled);
			$extension.find('.extName').attr('title', getI18N(enabled ? 'clkDisable' : 'clkEnable'));
		});
	};

	undoStack.do(() => {
		toggle(!wasEnabled);
	}, () => {
		toggle(wasEnabled);
	});
});

// Show extra buttons on right click
eul.on('contextmenu', '.ext', () => {
	$('[hidden]').removeAttr('hidden');
	$('#extList').addClass('show-option');
	return false;
});

// Enable uninstall button
eul.on('click', '.extUninstall', evt => {
	cme.uninstall(evt.currentTarget.parentNode.id);
});

// Enable filtering
$searchField.on('input', function () {
	const extensions = $('#extList li');
	const keywords = this.value.toLowerCase().split(' ').filter(s => s.length);
	const hiddenExtensions = extensions.not((i, element) => {
		return keywords.every(word => element.dataset.name.includes(word));
	});
	hiddenExtensions.hide();
	extensions.not(hiddenExtensions).show();
});

// Enable disable all button
$disableAllButton.click(() => {
	toggleAll(false);
});
$enableAllButton.click(() => {
	toggleAll(true);
});

// Enable chrome:// links
$('body').on('click', '[href^="chrome"]', evt => {
	chrome.tabs.create({url: evt.currentTarget.href});
	return false;
}).on('click', '.disabled', evt => {
	evt.preventDefault();
});

// Update list on uninstall
cme.onUninstalled.addListener(id => {
	$('#' + escapeCssId(id)).remove();
});

/**
 * FUNCTIONS
 */
function getIcon(icons, size = 16) {
	// Set fallback icon
	let selectedIcon = 'icons/puzzle.svg';

	// Get retina size if necessary
	size *= window.devicePixelRatio;

	if (icons && icons.length > 0) {
		// Get a large icon closest to the desired size
		icons.reverse().some(icon => {
			if (icon.size < size) {
				return false;
			}

			selectedIcon = icon.url;
			return true;
		});
	}

	return selectedIcon;
}

function createList(evt) {
	const url = evt.installType === 'normal' ? `https://chrome.google.com/webstore/detail/${evt.id}` : evt.homepageUrl;
	return `
		<li class='ext ${evt.enabled ? '' : 'disabled'} type-${evt.installType}' id='${evt.id}' data-name="${evt.name.toLowerCase()}">
			<button class='extName' title='${getI18N('toggleEnable')}'>
				<img class='extIcon' src='${getIcon(evt.icons, 16)}'>
				<span title="${evt.name}">${evt.name}</span>
			</button>
			${
	evt.optionsUrl ? `
					<a class='extOptions' href='chrome://extensions/?options=${evt.id}' title='${getI18N('gotoOpt')}' target='_blank'></a>
				` : ''
}
			<a hidden class="extUrl ${url ? '' : 'disabled'}" href='${url ? url : ''}' title='${url ? getI18N('openUrl') : ''}' target='_blank'></a>
			<a hidden class="extMore" href='chrome://extensions/?id=${evt.id}' title='${getI18N('manage')}' target='_blank'></a>
			<button hidden class="extUninstall" title='${getI18N('uninstall')}' ></button>
		</li>
	`;
}

function toggleAll(enable) {
	getExtensions(extensions => {
		const wereEnabled = extensions.filter(ext => enable ? !ext.enabled : ext.enabled);
		const selector = wereEnabled.map(ext => '#' + escapeCssId(ext.id)).join(',');
		const $wereEnabled = $(selector);

		undoStack.do(disable => {
			wereEnabled.forEach(extension => {
				cme.setEnabled(extension.id, enable ? disable : !disable);
			});
			$wereEnabled.toggleClass('disabled', enable ? !disable : disable);
		});
	});
}

function getExtensions(callback) {
	cme.getAll(exts => {
		callback(exts.filter(ext => ext.type === 'extension' && ext.id !== myid));
	});
}
