#!/usr/bin/env bash
set -euo pipefail

extension_id="${1:-}"
browser="${2:-brave}"

if [[ ! "$extension_id" =~ ^[a-p]{32}$ ]]; then
	echo "Usage: $0 <32-character-extension-id> [brave|chrome]" >&2
	exit 2
fi

case "$browser" in
	brave)
		browser_app="Brave Browser"
		manifest_dirs=(
			"$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
			"$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
			"$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
		)
		;;
	chrome)
		browser_app="Google Chrome"
		manifest_dirs=(
			"$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
			"$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
		)
		;;
	*)
		echo "Unsupported browser: $browser" >&2
		exit 2
		;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install_dir="$HOME/.local/share/one-click-extensions-manager/native-helper"
node_bin="$(command -v node || true)"

if [[ -z "$node_bin" ]]; then
	echo "Node.js is required to install the native popup helper." >&2
	exit 1
fi

mkdir -p "$install_dir" "$HOME/Library/LaunchAgents" "${manifest_dirs[@]}"
cp "$script_dir/native-host.mjs" "$install_dir/native-host.mjs"
cp "$script_dir/native-http-host.mjs" "$install_dir/native-http-host.mjs"
chmod 755 "$install_dir/native-host.mjs" "$install_dir/native-http-host.mjs"

if command -v cc >/dev/null 2>&1; then
	cc "$script_dir/native-host-launcher.c" \
		-DOCEM_NODE_BIN="\"$node_bin\"" \
		-o "$install_dir/native-host"
else
	cat >"$install_dir/native-host" <<EOF
#!/usr/bin/env bash
exec "$node_bin" "$install_dir/native-host.mjs"
EOF
fi
chmod 755 "$install_dir/native-host"

cat >"$install_dir/native-host-config.json" <<EOF
{
  "browserApp": "$browser_app",
  "extensionId": "$extension_id"
}
EOF

manifest_path="$install_dir/com.ocem.popuphost.json"
cat >"$manifest_path" <<EOF
{
  "name": "com.ocem.popuphost",
  "description": "One Click Extensions Manager popup opener",
  "path": "$install_dir/native-host",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$extension_id/"
  ]
}
EOF

for manifest_dir in "${manifest_dirs[@]}"; do
	cp "$manifest_path" "$manifest_dir/com.ocem.popuphost.json"
	rm -f \
		"$manifest_dir/com.one_click_extensions_manager.popup_helper.json" \
		"$manifest_dir/com.oneclickextensionsmanager.popuphelper.json" \
		"$manifest_dir/com.openai.ocemtest.json"
done

label="com.ocem.popuphost.http"
plist_path="$HOME/Library/LaunchAgents/$label.plist"
cat >"$plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>$label</string>
	<key>ProgramArguments</key>
	<array>
		<string>$node_bin</string>
		<string>$install_dir/native-http-host.mjs</string>
	</array>
	<key>WorkingDirectory</key>
	<string>$install_dir</string>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
	<key>ProcessType</key>
	<string>Interactive</string>
	<key>StandardOutPath</key>
	<string>/tmp/com.ocem.popuphost.http.log</string>
	<key>StandardErrorPath</key>
	<string>/tmp/com.ocem.popuphost.http.err</string>
</dict>
</plist>
EOF

pid_file="$install_dir/http-host.pid"
if [[ -f "$pid_file" ]]; then
	old_pid="$(cat "$pid_file" || true)"
	if [[ "$old_pid" =~ ^[0-9]+$ ]] && kill -0 "$old_pid" 2>/dev/null; then
		kill "$old_pid" || true
	fi
fi

start_standalone_helper() {
	nohup "$node_bin" "$install_dir/native-http-host.mjs" >/tmp/com.ocem.popuphost.http.log 2>/tmp/com.ocem.popuphost.http.err &
	echo "$!" >"$pid_file"
	echo "Started local helper with nohup fallback."
}

wait_for_health() {
	"$node_bin" <<'NODE'
const deadline = Date.now() + 5000;
let lastError = '';
while (Date.now() < deadline) {
	try {
		const response = await fetch('http://127.0.0.1:17645/health');
		if (response.ok) {
			process.exit(0);
		}

		lastError = `HTTP ${response.status}`;
	} catch (error) {
		lastError = error.message;
	}

	await new Promise(resolve => {
		setTimeout(resolve, 250);
	});
}
throw new Error(`Local helper health check failed: ${lastError}`);
NODE
}

if command -v launchctl >/dev/null 2>&1; then
	gui_domain="gui/$(id -u)"
	launchctl bootout "$gui_domain" "$plist_path" >/dev/null 2>&1 || true
	launchctl bootout "$gui_domain/$label" >/dev/null 2>&1 || true
fi

start_standalone_helper

wait_for_health

echo "Installed native popup helper."
echo "Native host manifests:"
for manifest_dir in "${manifest_dirs[@]}"; do
	echo "- $manifest_dir/com.ocem.popuphost.json"
done
echo "Installed helper: $install_dir"
echo "Local helper: http://127.0.0.1:17645/open-extension-popup"
