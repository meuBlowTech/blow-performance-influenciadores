@echo off
rem Sobe o build de producao (npm run build) na porta 5173.
rem Segredos vem do .env.local. Chamado pela tarefa agendada BlowInfluenciadoresSite.
cd /d "%~dp0.."
set PORT=5173
set HOST=0.0.0.0
rem Sincroniza as lojas da Trinks com a lista de unidades ao subir e a cada 6h.
set TRINKS_SYNC_AUTO=1
"C:\Program Files\nodejs\node.exe" --env-file=.env.local .output\server\index.mjs >> "%~dp0..\logs\site.log" 2>&1
