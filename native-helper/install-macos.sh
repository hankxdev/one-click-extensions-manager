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
		manifest_dir="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
		;;
	chrome)
		browser_app="Google Chrome"
		manifest_dir="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
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

mkdir -p "$install_dir" "$manifest_dir" "$HOME/Library/LaunchAgents"
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

cat >"$manifest_dir/com.ocem.popuphost.json" <<EOF
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

plist_path="$HOME/Library/LaunchAgents/com.ocem.popuphost.http.plist"
cat >"$plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>com.ocem.popuphost.http</string>
	<key>ProgramArguments</key>
	<array>
		<string>$node_bin</string>
		<string>$install_dir/native-http-host.mjs</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
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

nohup "$node_bin" "$install_dir/native-http-host.mjs" >/tmp/com.ocem.popuphost.http.log 2>/tmp/com.ocem.popuphost.http.err &
echo "$!" >"$pid_file"

sleep 0.8
"$node_bin" <<'NODE'
const response = await fetch('http://127.0.0.1:17645/health');
if (!response.ok) {
	throw new Error(`Health check failed with HTTP ${response.status}`);
}
NODE

echo "Installed native popup helper."
echo "Native host manifest: $manifest_dir/com.ocem.popuphost.json"
echo "Installed helper: $install_dir"
echo "Local helper: http://127.0.0.1:17645/open-extension-popup"
