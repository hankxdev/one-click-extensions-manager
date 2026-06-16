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
[[ -x "$helper_dir/native-clicker" ]] && echo "[OK] Native clicker executable exists" || echo "[FAIL] Missing native clicker executable"
[[ -f "$helper_dir/native-host-config.json" ]] && echo "[OK] Native host config exists" || echo "[FAIL] Missing native host config"
[[ -f "$helper_dir/native-http-host.mjs" ]] && echo "[OK] Local helper script exists" || echo "[FAIL] Missing local helper script"

if [[ -x "$helper_dir/native-clicker" ]]; then
	if "$helper_dir/native-clicker" --check >/dev/null 2>&1; then
		echo "[OK] Native clicker has Accessibility access"
	else
		echo "[FAIL] Native clicker needs Accessibility access. Run: \"$helper_dir/native-clicker\" --prompt"
	fi
fi

if [[ -x "$helper_dir/native-host" ]]; then
	if "$helper_dir/native-host" --check >/dev/null 2>&1; then
		echo "[OK] Native host has Accessibility access"
	else
		echo "[FAIL] Native host needs Accessibility access. Run: \"$helper_dir/native-host\" --prompt"
	fi
fi
[[ -f "$plist" ]] && echo "[OK] LaunchAgent exists: $plist" || echo "[FAIL] Missing LaunchAgent: $plist"

if [[ -f "$helper_dir/native-host-config.json" ]]; then
	HELPER_CONFIG="$helper_dir/native-host-config.json" node <<'NODE' || true
const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync(process.env.HELPER_CONFIG, 'utf8'));
if (config.browserProfilePath) {
	const securePreferences = `${config.browserProfilePath}/Secure Preferences`;
	console.log(
		fs.existsSync(securePreferences)
			? `[OK] Browser profile preferences found: ${securePreferences}`
			: `[WARN] Browser profile preferences missing: ${securePreferences}`,
	);
}
NODE
fi

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
