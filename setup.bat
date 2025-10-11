@echo off
echo ========================================
echo Journey AI - Quick Setup Script
echo ========================================
echo.

echo Step 1: Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo Step 2: Checking environment file...
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: You need to add your OpenAI API key to the .env file!
    echo.
    echo 1. Get your API key from: https://platform.openai.com/api-keys
    echo 2. Open .env file in a text editor
    echo 3. Replace "your_openai_api_key_here" with your actual API key
    echo 4. Save the file
    echo.
) else (
    echo .env file already exists
)

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Add your OPENAI_API_KEY to the .env file
echo 2. Start the server: node server-production.js
echo 3. Run tests: node test-all-capabilities.js
echo.
pause
