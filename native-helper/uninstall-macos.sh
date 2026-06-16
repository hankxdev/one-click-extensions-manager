#!/usr/bin/env bash
set -euo pipefail

helper_dir="$HOME/.local/share/one-click-extensions-manager/native-helper"
for manifest in \
	"$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.ocem.popuphost.json" \
	"$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.ocem.popuphost.json"
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
rm -f "$HOME/Library/LaunchAgents/com.ocem.popuphost.http.plist"
echo "Uninstalled native popup helper."
