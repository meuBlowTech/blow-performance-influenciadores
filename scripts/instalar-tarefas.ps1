# Registra as tarefas agendadas que mantêm o dashboard no ar nesta máquina:
#   BlowInfluenciadoresSite   -> scripts\start-site.cmd   (build de produção na porta 5173)
#   BlowInfluenciadoresTunnel -> scripts\start-tunnel.cmd (https://influencers.blow.ia.br)
# Mesmas configurações das tarefas do ponto-equilibrio: iniciam com a máquina,
# sem limite de tempo, reiniciam sozinhas se o processo cair.
# Uso (PowerShell como Administrator): powershell -ExecutionPolicy Bypass -File scripts\instalar-tarefas.ps1

$repo = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $repo "logs") | Out-Null

$principal = New-ScheduledTaskPrincipal -UserId "Administrator" -LogonType S4U -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$trigger = New-ScheduledTaskTrigger -AtStartup

foreach ($t in @(
    @{ Nome = "BlowInfluenciadoresSite"; Script = "start-site.cmd" },
    @{ Nome = "BlowInfluenciadoresTunnel"; Script = "start-tunnel.cmd" }
  )) {
  $action = New-ScheduledTaskAction -Execute "C:\Windows\System32\cmd.exe" `
    -Argument "/c `"$repo\scripts\$($t.Script)`"" -WorkingDirectory $repo
  Register-ScheduledTask -TaskName $t.Nome -Action $action -Trigger $trigger -Principal $principal `
    -Settings $settings -Description "Dashboard de influenciadores bLOw ($($t.Script))" -Force | Out-Null
  Start-ScheduledTask -TaskName $t.Nome
}

Get-ScheduledTask -TaskName "BlowInfluenciadores*" | Format-Table TaskName, State
