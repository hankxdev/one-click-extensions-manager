#!/usr/bin/env bash
set -euo pipefail

browser="${1:-brave}"
case "$browser" in
	brave)
		manifest="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.ocem.popuphost.json"
		;;
	chrome)
		manifest="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.ocem.popuphost.json"
		;;
	*)
		echo "[FAIL] Unsupported browser: $browser"
		exit 2
		;;
esac

helper_dir="$HOME/.local/share/one-click-extensions-manager/native-helper"
label="com.ocem.popuphost.http"
plist="$HOME/Library/LaunchAgents/$label.plist"
service="gui/$(id -u)/$label"
pid_file="$helper_dir/http-host.pid"

[[ -f "$manifest" ]] && echo "[OK] Native manifest exists: $manifest" || echo "[FAIL] Missing native manifest: $manifest"
[[ -x "$helper_dir/native-host" ]] && echo "[OK] Native host executable exists" || echo "[FAIL] Missing native host executable"
[[ -f "$helper_dir/native-host-config.json" ]] && echo "[OK] Native host config exists" || echo "[FAIL] Missing native host config"
[[ -f "$helper_dir/native-http-host.mjs" ]] && echo "[OK] Local helper script exists" || echo "[FAIL] Missing local helper script"
[[ -f "$plist" ]] && echo "[OK] LaunchAgent exists: $plist" || echo "[FAIL] Missing LaunchAgent: $plist"

standalone_running=false
if [[ -f "$pid_file" ]]; then
	pid="$(cat "$pid_file" || true)"
	if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
		standalone_running=true
		echo "[OK] Standalone local helper is running: pid $pid"
	fi
fi

if command -v launchctl >/dev/null 2>&1; then
	if launchctl print "$service" >/dev/null 2>&1; then
		echo "[OK] LaunchAgent is loaded: $service"
	elif [[ "$standalone_running" == true ]]; then
		echo "[OK] LaunchAgent is not loaded; standalone helper mode is active"
	else
		echo "[FAIL] LaunchAgent is not loaded: $service"
	fi
else
	echo "[WARN] launchctl is unavailable"
fi

node <<'NODE' || true
try {
	const response = await fetch('http://127.0.0.1:17645/health');
	console.log(response.ok ? '[OK] Local helper health is reachable' : `[FAIL] Local helper returned HTTP ${response.status}`);
} catch (error) {
	console.log(`[FAIL] Local helper is not reachable: ${error.message}`);
}
NODE
