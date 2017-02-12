const cme = chrome.management;
const eul = $('#extList');
const getI18N = chrome.i18n.getMessage;
const searchText = $('#searchext');
let curExtID;

// disable the default context menu
window.oncontextmenu = () => false;

searchText.attr('placeholder', getI18N('searchTxt')).focus();

$('#disableAll').text(getI18N('disAll')).click(() => {
	const c = confirm(getI18N('disableAll'));
	if (c) {
		disableAll();
	}
});
$('#extensionPage').text(getI18N('extensionPage')).click(() => {
	chrome.tabs.create({url: 'chrome://extensions'});
});
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

$('body').on('click', 'li.ext', function (e) {
	const that = $(this);
	const extSel = that.find('.extName');
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
}).on('click', 'li .extIcon a', function (e) {
	const that = $(this);
	const href = that.attr('href');
	if (href !== '#') {
		chrome.tabs.create({url: href});
	}
}).on('mouseup', 'li.ext', function (e) {
	if (e.which == 3) {
		const that = $(this);
		const eid = that.find('.extName').attr('data-id');
		cme.uninstall(eid);
	}
});

cme.onUninstalled.addListener(id => {
	$(`#${id}`).remove();
});

searchText.on('keyup', function (e) {
	const keyword = $(this).val();
	const extLists = $('#extList').find('li');
	if (keyword.trim() == '') {
		extLists.show();
	} else {
		extLists.each(function () {
			if (!$(this).text().toLowerCase().includes(keyword.toLowerCase())) {
				$(this).hide();
			} else {
				$(this).show();
			}
		});
	}
});

function createList(e, enabled) {
	return `
		<li class='ext ${enabled ? '' : 'disabled'}' id='${e.id}'>
			<span class='extIcon' title='${e.optionsUrl ? getI18N('openOpt') : ''}'>
				<a href='${e.optionsUrl ? e.optionsUrl : ''}'>
					<img
						src='${e.icons ? e.icons[0].url : chrome.extension.getURL('plugin.png')}'
						class='${e.optionsUrl ? 'hasOpt' : ''}'
					>
				</a>
			</span>
			<span class='extName' data-id='${e.id}' title='${getI18N('toggleEnable')}'>${e.name}</span>
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
