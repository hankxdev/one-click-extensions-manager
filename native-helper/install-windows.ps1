param(
	[Parameter(Mandatory = $true)]
	[string] $ExtensionId,

	[ValidateSet('brave', 'chrome', 'edge', 'chromium')]
	[string] $Browser = 'brave'
)

$ErrorActionPreference = 'Stop'

if ($ExtensionId -notmatch '^[a-p]{32}$') {
	Write-Error 'Usage: install-windows.ps1 -ExtensionId <32-character-extension-id> [-Browser brave|chrome|edge|chromium]'
	exit 2
}

$browserConfigs = @{
	brave = @{
		DisplayName = 'Brave'
		ProcessNames = @('brave')
	}
	chrome = @{
		DisplayName = 'Google Chrome'
		ProcessNames = @('chrome')
	}
	edge = @{
		DisplayName = 'Microsoft Edge'
		ProcessNames = @('msedge')
	}
	chromium = @{
		DisplayName = 'Chromium'
		ProcessNames = @('chromium')
	}
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
	Write-Error 'Node.js is required. Install Node.js, restart PowerShell, then run this installer again.'
	exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installDir = Join-Path $env:LOCALAPPDATA 'OnFire Extensions Manager\native-helper'
$configPath = Join-Path $installDir 'native-host-config.json'
$pidPath = Join-Path $installDir 'http-host.pid'
$taskName = 'OnFire Extensions Manager Popup Helper'
$browserConfig = $browserConfigs[$Browser]

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Copy-Item -Force -Path (Join-Path $scriptDir 'native-host.mjs') -Destination (Join-Path $installDir 'native-host.mjs')
Copy-Item -Force -Path (Join-Path $scriptDir 'native-http-host.mjs') -Destination (Join-Path $installDir 'native-http-host.mjs')

$config = [ordered]@{
	extensionId = $ExtensionId
	browserDisplayName = $browserConfig.DisplayName
	browserProcessNames = $browserConfig.ProcessNames
}
$json = $config | ConvertTo-Json -Depth 4
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($configPath, $json, $utf8NoBom)

function Test-OnFireHelperHealth {
	param([int] $Attempts = 20)

	for ($index = 0; $index -lt $Attempts; $index++) {
		try {
			$response = Invoke-RestMethod -Uri 'http://127.0.0.1:17645/health' -TimeoutSec 2
			if ($response.ok) {
				return $true
			}
		} catch {}

		Start-Sleep -Milliseconds 250
	}

	return $false
}

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
	Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
	Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

if (Test-Path $pidPath) {
	$oldPid = Get-Content $pidPath -ErrorAction SilentlyContinue
	if ($oldPid -match '^[0-9]+$') {
		Stop-Process -Id ([int] $oldPid) -ErrorAction SilentlyContinue
	}
}

$hostScript = Join-Path $installDir 'native-http-host.mjs'
$action = New-ScheduledTaskAction -Execute $node.Source -Argument "`"$hostScript`"" -WorkingDirectory $installDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DisallowStartIfOnBatteries:$false -MultipleInstances IgnoreNew
$settings.ExecutionTimeLimit = [TimeSpan]::Zero
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Runs the OnFire Extensions Manager local popup helper.' -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

if (-not (Test-OnFireHelperHealth)) {
	$process = Start-Process -FilePath $node.Source -ArgumentList "`"$hostScript`"" -WorkingDirectory $installDir -WindowStyle Hidden -PassThru
	Set-Content -Path $pidPath -Value $process.Id -Encoding ascii
	if (-not (Test-OnFireHelperHealth)) {
		Write-Error 'Installed files, but the local helper did not pass its health check.'
		exit 1
	}
}

Write-Host '[OK] Installed OnFire Extensions Manager popup helper for Windows.'
Write-Host "[OK] Helper files: $installDir"
Write-Host "[OK] Scheduled task: $taskName"
Write-Host '[OK] Local helper: http://127.0.0.1:17645/open-extension-popup'
