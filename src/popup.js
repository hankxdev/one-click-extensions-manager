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
const $list = $('<ul id="extList">');
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
	.append($list);

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
	$list.append(listHTML.join(''));
});

/**
 * EVENT LISTENERS
 */

// Toggle on click
$list.on('click', '.extName', event => {
	const $extension = $(event.currentTarget).parent();
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

// Show extra buttons on right click on the name
$list.on('contextmenu', '.extName', () => {
	$('[hidden]').removeAttr('hidden');
	return false;
});

// Enable uninstall button
$list.on('click', '.extUninstall', event => {
	cme.uninstall(event.currentTarget.parentNode.id);
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
$('body').on('click', '[href^="chrome"]', event => {
	chrome.tabs.create({url: event.currentTarget.href});
	return false;
});

// Update list on uninstall
cme.onUninstalled.addListener(id => {
	$('#' + escapeCssId(id)).remove();
});

$('html')
	.attr({
		lang: chrome.i18n.getUILanguage(),
		dir: chrome.i18n.getMessage('@@bidi_dir')
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

function createList({id, name, enabled, installType, homepageUrl, optionsUrl, icons}) {
	const url = installType === 'normal' ? `https://chrome.google.com/webstore/detail/${id}` : homepageUrl;
	return `
		<li class='ext ${enabled ? '' : 'disabled'} type-${installType}' id='${id}' data-name="${name.toLowerCase()}">
			<button class='extName' title='${getI18N('toggleEnable')}'>
				<img class='extIcon' src='${getIcon(icons, 16)}'>
				${name.length < 25 ? name : `<span title="${name}">${name}</span>`}
			</button>
			${
				optionsUrl ? `
					<a class='extOptions' href='chrome://extensions/?options=${id}' title='${getI18N('gotoOpt')}' target='_blank'></a>
				` : ''
			}
			${
				url ? `
					<a hidden class="extUrl" href='${url}' title='${getI18N('openUrl')}' target='_blank'></a>
				` : ''
			}
			<a hidden class="extMore" href='chrome://extensions/?id=${id}' title='${getI18N('manage')}' target='_blank'></a>
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
