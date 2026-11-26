@echo off
setlocal enabledelayedexpansion
title REAL-TIME SIGN GESTURE RECOGNITION FOR ASSISTIVE COMMUNICATION

echo =====================================================================
echo  REAL-TIME SIGN GESTURE RECOGNITION FOR ASSISTIVE COMMUNICATION
echo  Academic Capstone & Assistive AI System
echo =====================================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ and restart this script.
    pause
    exit /b 1
)

:: 2. Check Node
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ and restart this script.
    pause
    exit /b 1
)

echo [1/4] Checking Python and Node environments...
echo Python detected.
echo Node.js detected.
echo.

:: 3. Options Menu
echo Select Startup Option:
echo [1] Start Complete Application (FastAPI Backend + Vite Frontend)
echo [2] Download/Prepare ASL Alphabet Dataset
echo [3] Train CNN Alphabet Model
echo [4] Install All Dependencies (Python pip + npm)
echo [5] Run Automated System Verification Tests
echo [6] Download & Prepare Word-Level ASL Dataset (WLASL)
echo [7] Train Word-Level Sequence Model (Bi-LSTM)
echo.
set /p OPT="Enter option [1-7] (Default: 1): "
if "%OPT%"=="" set OPT=1

if "%OPT%"=="4" (
    echo.
    echo Installing backend dependencies...
    pip install -r requirements.txt
    echo.
    echo Installing frontend dependencies...
    cd frontend && npm install && cd ..
    echo Done installing dependencies!
    pause
    exit /b 0
)

if "%OPT%"=="2" (
    echo.
    echo Running automated alphabet dataset download and preparation...
    python prepare_dataset_cli.py
    pause
    exit /b 0
)

if "%OPT%"=="3" (
    echo.
    echo Training CNN alphabet model...
    python train_model_cli.py
    pause
    exit /b 0
)

if "%OPT%"=="6" (
    echo.
    echo Downloading and extracting 30-frame landmark sequences for 20 ASL word classes...
    python scripts/prepare_word_dataset.py
    pause
    exit /b 0
)

if "%OPT%"=="7" (
    echo.
    echo Training Bidirectional LSTM sequence model for ASL words...
    python scripts/train_word_model.py
    pause
    exit /b 0
)

if "%OPT%"=="5" (
    echo.
    echo Running end-to-end system test suite...
    python -m unittest discover -s tests -p "test_*.py"
    pause
    exit /b 0
)

:: Default: Start Both Backend and Frontend in Parallel
echo.
echo [2/4] Starting FastAPI backend on http://127.0.0.1:8000 ...
start "ASL Backend API (FastAPI)" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 >nul

echo [3/4] Starting React Vite frontend on http://localhost:5173 ...
cd frontend
start "ASL Assistive Frontend (Vite)" cmd /k "npm run dev"
cd ..

echo.
echo =====================================================================
echo  APPLICATION LAUNCHED SUCCESSFULLY!
echo =====================================================================
echo  Backend API Docs:    http://127.0.0.1:8000/docs
echo  Frontend Dashboard:  http://localhost:5173
echo =====================================================================
echo.
echo Press any key to close this launcher (servers will keep running).
pause >nul
