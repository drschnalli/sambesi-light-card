param(
  [string]$HomeAssistantConfig = "C:\homeassistant\config"
)
$target = Join-Path $HomeAssistantConfig "www\community\sambesi-light-card"
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -Force "dist\sambesi-light-card.js" (Join-Path $target "sambesi-light-card.js")
Write-Host "Installed to $target"
Write-Host "Resource URL: /local/community/sambesi-light-card/sambesi-light-card.js"
