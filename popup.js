var cme = chrome.management,
	eul = $("#extList"),
	getI18N = chrome.i18n.getMessage,
	searchText = $("#searchext"),
	curExtID;
//disable the default context menu
window.oncontextmenu = function (){
	return false;
};

searchText.attr("placeholder", getI18N("searchTxt")).focus();

$("#disableAll").text(getI18N("disAll")).click(function (){
	var c = confirm(getI18N("disableAll"));
	if (c) {
		disableAll();
	}
});
$("#extensionPage").text(getI18N("extensionPage")).click(function (){
	chrome.tabs.create({url:"chrome://extensions"});
});
cme.getAll(function (ets){
	var enableArr = [], disableArr = [];
	$.each(ets, function (i, e){
		if (!e.isApp) {
			if (e.enabled) {
				enableArr.push(e.name.toLowerCase());
			} else {
				disableArr.push(e.name.toLowerCase());
			}
		}
	});
	//sort the extension name
	enableArr.sort();
	disableArr.sort();
	var extListStr = "";
	$.each(enableArr, function (i, n){
		$.each(ets, function (j, e){
			if (e && e.name.toLowerCase() === n && e.enabled) {
				extListStr += createList(e, e.enabled);
				delete ets[j];
				return false;
			}
		});
	});
	$.each(disableArr, function (i, n){
		$.each(ets, function (j, e){
			if (e && e.name.toLowerCase() === n && !e.enabled) {
				extListStr += createList(e, e.enabled);
				delete ets[j];
				return false;
			}
		});
	});

	eul.append(extListStr);
	$("#pbgjpgbpljobkekbhnnmlikbbfhbhmem").remove();
});

$("body").on("click", "li.ext .extName", function (e){
	var that = $(this);
	var eid = that.attr("data-id");
	cme.get(eid, function (e){
		that.parent().remove();
		if (!e.enabled) {
			cme.setEnabled(eid, true, function (){
				eul.prepend(createList(e, true));
			});
		} else {
			cme.setEnabled(eid, false, function (){
				eul.append(createList(e, false));
			});
		}
	});
}).on("click", "li .extIcon a", function (e){
	var that = $(this), href = that.attr("href");
	if (href !== "#") {
		chrome.tabs.create({url:href});
	}
}).on("mouseup", "li.ext", function (e){
	if (e.which == 3) {
		var that = $(this);
		var eid = that.find(".extName").attr("data-id");
		cme.uninstall(eid);
	}
});

cme.onUninstalled.addListener(function (id){
	$("#" + id).remove();
});

searchText.on("keyup", function (e){
	var keyword = $(this).val(),
		extLists = $("#extList").find("li");
	if (keyword.trim() == "") {
		extLists.show();
	} else {
		extLists.each(function (){
			if ($(this).text().toLowerCase().indexOf(keyword.toLowerCase()) === -1) {
				$(this).hide();
			} else {
				$(this).show();
			}
		});
	}
});

function createList(e, enabled){
	var t = "";
	if (!enabled) {
		t = "<li class='ext disabled' id='" + e.id + "'>";
	} else {
		t = "<li class='ext' id='" + e.id + "' >";
	}
	if (!e.optionsUrl) {
		t += "<span class='extIcon'><a href='#'><img src= '" + (e.icons ? e.icons[0].url:chrome.extension.getURL("plugin.png")) + "'></a></span>" +
			"<span class='extName' data-id='" + e.id + "' title='" + getI18N("toggleEnable") + "'>" + e.name + "</span></li>";
	} else {
		t += "<span title='" + getI18N("openOpt") + "' class='extIcon'><a href='" + e.optionsUrl + "'><img class='hasOpt' src= '" + (e.icons ? e.icons[0].url:chrome.extension.getURL("plugin.png")) + "' ></a></span>" +
			"<span class='extName' data-id='" + e.id + "' title='" + getI18N("toggleEnable") + "'>" + e.name + "</span></li>";
	}

	return t;
}

function disableAll(){
	cme.getAll(function (ets){
		var myid = getI18N("@@extension_id");
		for (var i = 0; i < ets.length; i++) {
			if (ets[i].id !== myid) {
				cme.setEnabled(ets[i].id, false, function (){

				});
			}
		}
		$(".ext").addClass("disabled");
	});
}
