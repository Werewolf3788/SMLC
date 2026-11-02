@echo off
rem Runs the PC Health Report (keep this file in the same folder as PC-Health-Report.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PC-Health-Report.ps1"
pause
