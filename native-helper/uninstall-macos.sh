#!/usr/bin/env bash
set -euo pipefail

helper_dir="$HOME/.local/share/one-click-extensions-manager/native-helper"
label="com.ocem.popuphost.http"
plist_path="$HOME/Library/LaunchAgents/$label.plist"

if command -v launchctl >/dev/null 2>&1; then
	gui_domain="gui/$(id -u)"
	launchctl bootout "$gui_domain" "$plist_path" >/dev/null 2>&1 || true
	launchctl bootout "$gui_domain/$label" >/dev/null 2>&1 || true
fi

for manifest in \
	"$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.ocem.popuphost.json" \
	"$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.one_click_extensions_manager.popup_helper.json" \
	"$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.oneclickextensionsmanager.popuphelper.json" \
	"$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.openai.ocemtest.json" \
	"$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.ocem.popuphost.json" \
	"$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.one_click_extensions_manager.popup_helper.json" \
	"$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.oneclickextensionsmanager.popuphelper.json" \
	"$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.openai.ocemtest.json"
do
	rm -f "$manifest"
done

if [[ -f "$helper_dir/http-host.pid" ]]; then
	pid="$(cat "$helper_dir/http-host.pid" || true)"
	if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
		kill "$pid" || true
	fi
fi

rm -rf "$helper_dir"
rm -f "$plist_path"
echo "Uninstalled native popup helper."
