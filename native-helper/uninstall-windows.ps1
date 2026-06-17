param(
	[switch] $KeepFiles
)

$installDir = Join-Path $env:LOCALAPPDATA 'OnFire Extensions Manager\native-helper'
$pidPath = Join-Path $installDir 'http-host.pid'
$taskName = 'OnFire Extensions Manager Popup Helper'

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
	Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
	Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
	Write-Host "[OK] Removed scheduled task: $taskName"
}

if (Test-Path $pidPath) {
	$pidValue = Get-Content $pidPath -ErrorAction SilentlyContinue
	if ($pidValue -match '^[0-9]+$') {
		Stop-Process -Id ([int] $pidValue) -ErrorAction SilentlyContinue
	}
}

$escapedInstallDir = [Regex]::Escape($installDir)
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
	Where-Object { $_.CommandLine -match 'native-http-host\.mjs' -and $_.CommandLine -match $escapedInstallDir } |
	ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }

if (-not $KeepFiles -and (Test-Path $installDir)) {
	Remove-Item -Recurse -Force $installDir
	Write-Host "[OK] Removed helper files: $installDir"
}

Write-Host '[OK] Windows popup helper uninstall complete.'
