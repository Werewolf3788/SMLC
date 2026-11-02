<#
  Traveling Computer Tech - PC Health Report
  ------------------------------------------
  Run this ON the customer's Windows PC. It collects hardware, update, drive and
  security info, then saves a clean HTML report to the Desktop and opens it.
  Nothing is uploaded anywhere.

  How to run (easiest): double-click Run-Report.bat
  Or in PowerShell:     powershell -ExecutionPolicy Bypass -File .\PC-Health-Report.ps1
  For the most complete results, run as Administrator (Secure Boot / TPM checks need it).
#>

$ErrorActionPreference = 'SilentlyContinue'
$items = New-Object System.Collections.Generic.List[object]

function Add-Item {
    param([string]$Section, [string]$Label, [string]$Value, [string]$Status = 'info', [string]$Note = '')
    $items.Add([pscustomobject]@{ Section = $Section; Label = $Label; Value = $Value; Status = $Status; Note = $Note })
}

Write-Host 'Collecting PC information, one moment...'

# ---------- Basic system ----------
$cs   = Get-CimInstance Win32_ComputerSystem
$bios = Get-CimInstance Win32_BIOS
$os   = Get-CimInstance Win32_OperatingSystem
$cpu  = Get-CimInstance Win32_Processor | Select-Object -First 1

Add-Item 'System' 'Computer name' $env:COMPUTERNAME
Add-Item 'System' 'Make / model' ("{0} {1}" -f $cs.Manufacturer, $cs.Model)

if ($bios.ReleaseDate) {
    $years = [math]::Round(((Get-Date) - $bios.ReleaseDate).TotalDays / 365, 1)
    $st = 'info'; $note = 'The BIOS date is a rough hint of how old the machine is.'
    if ($years -gt 7) { $st = 'warn'; $note = 'Older hardware. May be reaching the end of its useful life.' }
    Add-Item 'System' 'BIOS date (machine age hint)' ("{0:yyyy-MM-dd} (about {1} years)" -f $bios.ReleaseDate, $years) $st $note
}

Add-Item 'System' 'Processor' ("{0} ({1} cores / {2} threads)" -f $cpu.Name.Trim(), $cpu.NumberOfCores, $cpu.NumberOfLogicalProcessors)

$ramGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
$st = 'ok'; $note = ''
if ($ramGB -le 4) { $st = 'bad'; $note = 'Very low for modern Windows. A RAM upgrade would help a lot.' }
elseif ($ramGB -lt 8) { $st = 'warn'; $note = 'On the low side. 8 GB or more is recommended.' }
Add-Item 'System' 'Memory (RAM)' ("$ramGB GB") $st $note

$gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1
if ($gpu) { Add-Item 'System' 'Graphics' $gpu.Name }

# ---------- Windows ----------
$st = 'ok'; $note = ''
if ($os.Caption -match 'Windows 10') {
    $st = 'warn'; $note = 'Windows 10 no longer receives free security updates (support ended October 2025).'
}
Add-Item 'Windows' 'Version' ("{0} (build {1})" -f $os.Caption, $os.BuildNumber) $st $note
Add-Item 'Windows' 'Installed on' ("{0:yyyy-MM-dd}" -f $os.InstallDate)

$uptime = (Get-Date) - $os.LastBootUpTime
$st = 'ok'; $note = ''
if ($uptime.TotalDays -gt 30) { $st = 'warn'; $note = 'Has not restarted in a long time. Restarting applies updates and clears slowdowns.' }
Add-Item 'Windows' 'Time since last restart' ("{0} days, {1} hours" -f $uptime.Days, $uptime.Hours) $st $note

# ---------- Updates ----------
$hf = Get-HotFix | Where-Object { $_.InstalledOn } | Sort-Object InstalledOn -Descending | Select-Object -First 1
if ($hf) {
    $days = [int]((Get-Date) - $hf.InstalledOn).TotalDays
    $st = 'ok'; $note = ''
    if ($days -gt 90) { $st = 'bad'; $note = 'No recent updates installed. This PC may be missing security fixes.' }
    elseif ($days -gt 45) { $st = 'warn'; $note = 'Updates are getting behind.' }
    Add-Item 'Updates' 'Last update installed' ("{0:yyyy-MM-dd} ({1} days ago)" -f $hf.InstalledOn, $days) $st $note
} else {
    Add-Item 'Updates' 'Last update installed' 'Could not be determined' 'info'
}

try {
    $session  = New-Object -ComObject Microsoft.Update.Session
    $result   = $session.CreateUpdateSearcher().Search('IsInstalled=0 and IsHidden=0')
    $pending  = $result.Updates.Count
    if ($pending -eq 0) { Add-Item 'Updates' 'Updates waiting to install' '0' 'ok' }
    else { Add-Item 'Updates' 'Updates waiting to install' "$pending" 'warn' 'Windows has updates that have not been installed yet.' }
} catch {
    Add-Item 'Updates' 'Updates waiting to install' 'Could not be checked' 'info'
}

$rebootPending = (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') -or
                 (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending')
if ($rebootPending) { Add-Item 'Updates' 'Restart needed' 'Yes' 'warn' 'A restart is waiting to finish installing updates.' }
else { Add-Item 'Updates' 'Restart needed' 'No' 'ok' }

# ---------- Drives ----------
Get-PhysicalDisk | ForEach-Object {
    $sizeGB = [math]::Round($_.Size / 1GB)
    $st = 'ok'; $note = ''
    if ($_.HealthStatus -ne 'Healthy') { $st = 'bad'; $note = 'Drive is reporting a problem. Back up the data right away.' }
    elseif ($_.MediaType -eq 'HDD') { $st = 'warn'; $note = 'Older spinning hard drive. Upgrading to an SSD is the biggest speed boost.' }
    Add-Item 'Drives' $_.FriendlyName ("{0} - {1} GB - Health: {2}" -f $_.MediaType, $sizeGB, $_.HealthStatus) $st $note
}

Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
    if ($_.Size -gt 0) {
        $freePct = [math]::Round(($_.FreeSpace / $_.Size) * 100)
        $st = 'ok'; $note = ''
        if ($freePct -lt 8) { $st = 'bad'; $note = 'Almost full. This slows the PC down and can stop updates.' }
        elseif ($freePct -lt 15) { $st = 'warn'; $note = 'Getting full.' }
        Add-Item 'Drives' ("Space on {0}" -f $_.DeviceID) ("{0} GB free of {1} GB ({2}% free)" -f [math]::Round($_.FreeSpace / 1GB), [math]::Round($_.Size / 1GB), $freePct) $st $note
    }
}

# ---------- Security ----------
$av = Get-CimInstance -Namespace 'root/SecurityCenter2' -ClassName AntiVirusProduct
if ($av) { Add-Item 'Security' 'Antivirus products' (($av | ForEach-Object { $_.displayName }) -join ', ') 'info' }
else { Add-Item 'Security' 'Antivirus products' 'None detected' 'bad' 'No antivirus was found.' }

$mp = Get-MpComputerStatus
if ($mp) {
    if ($mp.RealTimeProtectionEnabled) { Add-Item 'Security' 'Windows Defender real-time protection' 'On' 'ok' }
    else { Add-Item 'Security' 'Windows Defender real-time protection' 'Off' 'warn' 'Fine if another antivirus is in charge. Otherwise the PC is unprotected.' }
    $age = $mp.AntivirusSignatureAge
    $st = 'ok'; $note = ''
    if ($age -gt 7) { $st = 'warn'; $note = 'Virus definitions are out of date.' }
    Add-Item 'Security' 'Defender definitions age' ("$age days") $st $note
}

$fw = Get-NetFirewallProfile
if ($fw) {
    $off = @($fw | Where-Object { -not $_.Enabled })
    if ($off.Count -eq 0) { Add-Item 'Security' 'Firewall' 'On for all networks' 'ok' }
    else { Add-Item 'Security' 'Firewall' ("Off for: " + (($off | ForEach-Object { $_.Name }) -join ', ')) 'warn' 'The Windows firewall is turned off.' }
}

# Windows 11 readiness hints (need Administrator)
$tpm = Get-CimInstance -Namespace 'root/cimv2/Security/MicrosoftTpm' -ClassName Win32_Tpm
if ($tpm) { Add-Item 'Security' 'TPM (Windows 11 requirement)' ("Present, version " + ($tpm.SpecVersion -split ',')[0]) 'info' }
else { Add-Item 'Security' 'TPM (Windows 11 requirement)' 'Not found (or run as Administrator)' 'info' }

try {
    if (Confirm-SecureBootUEFI) { Add-Item 'Security' 'Secure Boot (Windows 11 requirement)' 'On' 'ok' }
    else { Add-Item 'Security' 'Secure Boot (Windows 11 requirement)' 'Off' 'info' }
} catch {
    Add-Item 'Security' 'Secure Boot (Windows 11 requirement)' 'Not supported or run as Administrator' 'info'
}

# ---------- Startup & network ----------
$startup = @(Get-CimInstance Win32_StartupCommand).Count
$st = 'ok'; $note = ''
if ($startup -gt 15) { $st = 'warn'; $note = 'Lots of programs start with Windows, which slows startup.' }
Add-Item 'Startup' 'Programs that start with Windows' "$startup" $st $note

Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } | ForEach-Object {
    Add-Item 'Network' $_.InterfaceAlias ("IP {0}, gateway {1}" -f $_.IPv4Address.IPAddress, $_.IPv4DefaultGateway.NextHop)
}

# ---------- Battery (laptops only) ----------
$bat = Get-CimInstance Win32_Battery | Select-Object -First 1
if ($bat) { Add-Item 'Battery' 'Charge level' ("{0}%" -f $bat.EstimatedChargeRemaining) }

# ---------- Build the HTML report ----------
$enc = { param($t) [System.Net.WebUtility]::HtmlEncode([string]$t) }
$bad  = @($items | Where-Object { $_.Status -eq 'bad' }).Count
$warn = @($items | Where-Object { $_.Status -eq 'warn' }).Count

if ($bad -gt 0)      { $summary = "$bad serious issue(s) and $warn item(s) worth attention." }
elseif ($warn -gt 0) { $summary = "$warn item(s) worth attention. Nothing urgent." }
else                 { $summary = 'Everything we checked looks healthy.' }

$sb = New-Object System.Text.StringBuilder
foreach ($section in ($items | Select-Object -ExpandProperty Section -Unique)) {
    [void]$sb.AppendLine("<h2>$(& $enc $section)</h2>")
    foreach ($i in ($items | Where-Object { $_.Section -eq $section })) {
        $mark = switch ($i.Status) { 'ok' { '&#10004;' } 'warn' { '&#9888;' } 'bad' { '&#10006;' } default { '&#8226;' } }
        $noteHtml = ''
        if ($i.Note) { $noteHtml = "<small>$(& $enc $i.Note)</small>" }
        [void]$sb.AppendLine("<div class='row $($i.Status)'><span class='mark'>$mark</span><div><strong>$(& $enc $i.Label)</strong>: $(& $enc $i.Value)$noteHtml</div></div>")
    }
}

$html = @"
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>PC Health Report - $($env:COMPUTERNAME)</title>
<style>
 body { font-family: 'Segoe UI', Tahoma, sans-serif; margin:0; color:#333; background:#f4f6f9; }
 header { background:#003366; color:#fff; padding:1.5rem; text-align:center; }
 header img { max-height:70px; vertical-align:middle; margin-left:12px; }
 header h1 { display:inline-block; margin:0; vertical-align:middle; }
 .wrap { max-width:850px; margin:auto; padding:1.5rem; }
 .summary { background:#fcf6de; border-left:6px solid #d4a017; padding:1rem 1.2rem; border-radius:6px; font-size:1.1rem; }
 h2 { color:#003366; border-bottom:2px solid #d4a017; padding-bottom:4px; margin-top:2rem; }
 .row { display:flex; gap:.8rem; background:#fff; padding:.6rem 1rem; margin-bottom:.4rem; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,.08); border-left:5px solid #999; }
 .row.ok { border-left-color:#2e7d32; } .row.warn { border-left-color:#d4a017; } .row.bad { border-left-color:#c0392b; }
 .mark { font-size:1.2rem; } .ok .mark { color:#2e7d32; } .warn .mark { color:#d4a017; } .bad .mark { color:#c0392b; }
 small { display:block; color:#666; margin-top:2px; }
 footer { text-align:center; color:#666; padding:2rem 1rem; font-size:.9rem; }
 @media print { body { background:#fff; } }
</style></head><body>
<header><h1>PC Health Report</h1>
<img src="https://raw.githubusercontent.com/Werewolf3788/SMLC/Claude-Test/images/traveling-computer-tech-logo.png" alt="Traveling Computer Tech"></header>
<div class="wrap">
 <p>Report for <strong>$($env:COMPUTERNAME)</strong> &mdash; $((Get-Date).ToString('MMMM d, yyyy h:mm tt'))</p>
 <div class="summary"><strong>Summary:</strong> $summary</div>
 $($sb.ToString())
</div>
<footer>Traveling Computer Tech &bull; (618) 708-4450 &bull; 607 W Clark Ave, Effingham, IL</footer>
</body></html>
"@

$desktop = [Environment]::GetFolderPath('Desktop')
$file = Join-Path $desktop ("PC-Health-Report-{0}-{1}.html" -f $env:COMPUTERNAME, (Get-Date).ToString('yyyy-MM-dd'))
$html | Out-File -FilePath $file -Encoding UTF8
Write-Host "Report saved to: $file"
Start-Process $file
