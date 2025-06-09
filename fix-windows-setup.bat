@echo off
echo Fixing Windows setup...

REM Generate a random session secret
set "chars=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "secret="
for /L %%i in (1,1,32) do call :PickRandomChar

REM Update .env file with generated secret
powershell -Command "(gc .env) -replace 'change-this-to-a-very-long-random-string-for-security', '%secret%' | Out-File -encoding ASCII .env"

echo [SUCCESS] Environment file configured with random session secret
echo.
echo Next steps:
echo 1. Edit .env file with your PostgreSQL credentials
echo 2. Run: npm run db:push
echo 3. Run: npm run dev
echo.

REM Ask if user wants to open .env file
set /p choice="Do you want to open .env file for editing now? (Y/N): "
if /i "%choice%"=="Y" (
    if exist "%PROGRAMFILES%\Microsoft VS Code\Code.exe" (
        "%PROGRAMFILES%\Microsoft VS Code\Code.exe" .env
    ) else (
        notepad .env
    )
)

goto :eof

:PickRandomChar
set /a "rand=%random% %% 62"
for /f %%c in ('echo %chars:~%rand%^,1%') do set "secret=%secret%%%c"
goto :eof