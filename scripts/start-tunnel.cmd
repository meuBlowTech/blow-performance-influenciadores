@echo off
rem Publica o site em https://influencers.blow.ia.br pelo Cloudflare Tunnel
rem blow-influenciadores. Chamado pela tarefa agendada BlowInfluenciadoresTunnel.
cd /d "%~dp0.."
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --config "%USERPROFILE%\.cloudflared\blow-influenciadores.yml" run blow-influenciadores >> "%~dp0..\logs\tunnel.log" 2>&1
