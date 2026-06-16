# Native Popup Helper

Chrome and Brave do not expose an extension API that lets one extension directly open another extension's action popup. This helper provides the practical macOS path: the manager asks a native host to click the target extension in the browser toolbar or Extensions menu. If Brave's accessibility tree does not expose that target, the helper reads the extension's stored manifest and opens its declared popup or options page in a compact Brave window instead of opening a new tab.

Install for Brave:

```sh
bash native-helper/install-macos.sh inbopcbofedcnafadmplaamkbffefmjo brave
```

Diagnose:

```sh
bash native-helper/diagnose-macos.sh brave
```

Uninstall:

```sh
bash native-helper/uninstall-macos.sh
```

The installer writes:

- Native messaging manifest: `~/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.ocem.popuphost.json`
- Helper files: `~/.local/share/one-click-extensions-manager/native-helper`
- Browser profile path used for manifest-popup fallback: `~/Library/Application Support/BraveSoftware/Brave-Browser/Default`
- Local fallback server: `http://127.0.0.1:17645/open-extension-popup`
- Local helper PID: `~/.local/share/one-click-extensions-manager/native-helper/http-host.pid`

The native messaging manifest restricts access to the installed manager extension ID. The local fallback server also rejects requests whose `Origin` is not that extension.

If macOS reports that `osascript` is not allowed assistive access, grant Accessibility permission to the app running the helper or reinstall the helper from a terminal/Codex session that already has Accessibility permission.
