const cme = chrome.management;
const getI18N = chrome.i18n.getMessage;

// Generate page
const $searchField = $(`<input placeholder="${ getI18N('searchTxt') }">`);
const eul = $('<ul id="extList">');
const $options = $('<div class="options">');
const $disableAllButton = $(`<button>${ getI18N('disAll') }</button>`);
const $extensionPageButton = $(`<button>${ getI18N('extensionPage') }</button>`);

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
	.filter(extension => extension.id !== 'pbgjpgbpljobkekbhnnmlikbbfhbhmem')
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
$('body').on('click', '.extName', e => {
	const $extension = $(e.currentTarget).parent();
	const id = $extension.attr('id');
	const wasEnabled = !$extension.hasClass('disabled');

	cme.setEnabled(id, !wasEnabled, () => {
		$extension.toggleClass('disabled', wasEnabled);
		$extension.find('.extName').attr('title', getI18N(wasEnabled ? 'clkEnable' : 'clkDisable'));
		if (wasEnabled) {
			eul.append($extension);
		} else {
			eul.prepend($extension);
		}
	})
}).on('mouseup', '.ext', e => {
	if (e.which == 3) {
		cme.uninstall(e.currentTarget.id);
	}
});

cme.onUninstalled.addListener(id => {
	$(`#${id}`).remove();
});

const extensions = $('#extList li');
$searchField.on('input', function () {
	const keywords = this.value.split(' ').filter(s => s.length);
	const hiddenExtensions = extensions.not((i, el) => {
		return keywords.every(word => el.dataset.name.includes(word));
	});
	hiddenExtensions.hide();
	extensions.not(hiddenExtensions).show();
});

// disable the default context menu
eul.on('contextmenu', () => false);

$disableAllButton.click(() => {
	if (confirm(getI18N('disableAll'))) {
		disableAll();
	}
});

$extensionPageButton.click(() => {
	chrome.tabs.create({url: 'chrome://extensions'});
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
		<li class='ext ${e.enabled ? '' : 'disabled'}' id='${e.id}' data-name="${e.name.toLowerCase()}">
			<span class='extName' title='${getI18N(e.enabled ? 'clkDisable' : 'clkEnable')}'>
				<img class='extIcon' src='${getIcon(e.icons, 16)}'>
				${e.name}
			</span>
			${
				e.optionsUrl ? `
					<a class='extOptions' href='${e.optionsUrl}' title='${getI18N('openOpt')}' target='_blank'>
						<img src="${chrome.extension.getURL('icon-options.svg')}">
					</a>
				` : ``
			}
		</li>
	`;
}

function disableAll() {
	cme.getAll(ets => {
		const myid = getI18N('@@extension_id');
		ets.forEach(extension => {
			if(extension.enabled && extension.id !== myid) {
				cme.setEnabled(extension.id, false);
			}
		});
		$('.ext').addClass('disabled');
	});
}
