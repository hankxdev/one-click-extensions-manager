const cme = chrome.management;
const getI18N = chrome.i18n.getMessage;

// Generate page
const searchText = $(`<input autofocus placeholder="${ getI18N('searchTxt') }">`);
const eul = $('<ul id="extList">');
const $options = $('<div class="options">');
const $disableAllButton = $(`<button>${ getI18N('disAll') }</button>`);
const $extensionPageButton = $(`<button>${ getI18N('extensionPage') }</button>`);

$options
	.append($disableAllButton)
	.append($extensionPageButton);

$('body')
	.append(searchText)
	.append($options)
	.append(eul);

// disable the default context menu
eul.on('contextmenu', () => false);

$disableAllButton.click(() => {
	const c = confirm(getI18N('disableAll'));
	if (c) {
		disableAll();
	}
});
$extensionPageButton.click(() => {
	chrome.tabs.create({url: 'chrome://extensions'});
});

// Generate extension list
cme.getAll(ets => {
	const enableArr = [];
	const disableArr = [];
	$.each(ets, (i, e) => {
		if (!e.isApp) {
			if (e.enabled) {
				enableArr.push(e.name.toLowerCase());
			} else {
				disableArr.push(e.name.toLowerCase());
			}
		}
	});
    // sort the extension name
	enableArr.sort();
	disableArr.sort();
	let extListStr = '';
	$.each(enableArr, (i, n) => {
		$.each(ets, (j, e) => {
			if (e && e.name.toLowerCase() === n && e.enabled) {
				extListStr += createList(e, e.enabled);
				delete ets[j];
				return false;
			}
		});
	});
	$.each(disableArr, (i, n) => {
		$.each(ets, (j, e) => {
			if (e && e.name.toLowerCase() === n && !e.enabled) {
				extListStr += createList(e, e.enabled);
				delete ets[j];
				return false;
			}
		});
	});

	eul.append(extListStr);
	$('#pbgjpgbpljobkekbhnnmlikbbfhbhmem').remove();
});

$('body').on('click', '.extName', function (e) {
	const extSel = $(this);
	const eid = extSel.attr('data-id');
	cme.get(eid, e => {
		extSel.parent().remove();
		if (!e.enabled) {
			cme.setEnabled(eid, true, () => {
				eul.prepend(createList(e, true));
			});
		} else {
			cme.setEnabled(eid, false, () => {
				eul.append(createList(e, false));
			});
		}
	});
}).on('click', '.extOptions', e => {
	chrome.tabs.create({url: e.currentTarget.href});
}).on('mouseup', '.extName', e => {
	if (e.which == 3) {
		cme.uninstall(e.target.dataset.id);
	}
});

cme.onUninstalled.addListener(id => {
	$(`#${id}`).remove();
});

searchText.on('keyup', function () {
	const keywords = this.value.split(' ').filter(s => s.length);
	const extensions = $('#extList li');
	const hiddenExtensions = extensions.not((i, el) => {
		return keywords.every(word => el.dataset.name.includes(word));
	});
	hiddenExtensions.hide();
	extensions.not(hiddenExtensions).show();
});

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

window.scrollTo(0, 0);

function createList(e, enabled) {
	return `
		<li class='ext ${enabled ? '' : 'disabled'}' id='${e.id}' data-name="${e.name.toLowerCase()}">
			<span class='extName' data-id='${e.id}' title='${getI18N('toggleEnable')}'>
				<img class='extIcon' src='${getIcon(e.icons, 16)}'>
				${e.name}
			</span>
			${
				e.optionsUrl ? `
					<a class='extOptions' href='${e.optionsUrl}' title='${getI18N('openOpt')}'>
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
		for (let i = 0; i < ets.length; i++) {
			if (ets[i].id !== myid) {
				cme.setEnabled(ets[i].id, false);
			}
		}
		$('.ext').addClass('disabled');
	});
}
