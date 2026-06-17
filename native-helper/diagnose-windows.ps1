param(
	[ValidateSet('brave', 'chrome', 'edge', 'chromium')]
	[string] $Browser = 'brave'
)

$installDir = Join-Path $env:LOCALAPPDATA 'OnFire Extensions Manager\native-helper'
$configPath = Join-Path $installDir 'native-host-config.json'
$taskName = 'OnFire Extensions Manager Popup Helper'

function Write-Check {
	param(
		[bool] $Ok,
		[string] $Message
	)

	if ($Ok) {
		Write-Host "[OK] $Message"
	} else {
		Write-Host "[FAIL] $Message"
	}
}

$node = Get-Command node -ErrorAction SilentlyContinue
Write-Check ([bool] $node) 'Node.js is available'
Write-Check (Test-Path (Join-Path $installDir 'native-host.mjs')) "Native host script exists: $installDir"
Write-Check (Test-Path (Join-Path $installDir 'native-http-host.mjs')) 'Local helper script exists'
Write-Check (Test-Path $configPath) 'Native host config exists'

if (Test-Path $configPath) {
	try {
		$config = Get-Content -Raw $configPath | ConvertFrom-Json
		Write-Check ($config.extensionId -match '^[a-p]{32}$') "Configured extension id: $($config.extensionId)"
		if ($config.browserProcessNames) {
			Write-Host "[OK] Browser process names: $($config.browserProcessNames -join ', ')"
		}
	} catch {
		Write-Host "[FAIL] Native host config is invalid JSON: $($_.Exception.Message)"
	}
}

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Write-Check ([bool] $task) "Scheduled task exists: $taskName"
if ($task) {
	Write-Host "[OK] Scheduled task state: $($task.State)"
}

try {
	$response = Invoke-RestMethod -Uri 'http://127.0.0.1:17645/health' -TimeoutSec 2
	Write-Check ($response.ok) 'Local helper health endpoint is responding'
} catch {
	Write-Host "[FAIL] Local helper health endpoint failed: $($_.Exception.Message)"
}

$processNames = @{
	brave = @('brave')
	chrome = @('chrome')
	edge = @('msedge')
	chromium = @('chromium')
}[$Browser]

$browserProcess = $processNames | ForEach-Object {
	Get-Process -Name $_ -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
} | Select-Object -First 1
Write-Check ([bool] $browserProcess) "Running browser window found for $Browser"
