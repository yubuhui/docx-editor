@echo off
rem Standalone eigenpal docx-editor demo (examples/vite).
rem Vite resolves @eigenpal/* to packages/*/src, so fork source edits
rem (including packages/i18n/zh-CN.json) show up live with no rebuild.
rem Stop the server with Ctrl+C in this window.
cd /d "%~dp0"
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:5173'"
bun run dev:react
