@echo off
REM --- שלב 1: טעינת נתונים לדאטאבייס ---
python complete_local_loader.py

REM --- שלב 2: הרצת כל מודלי XGBoost ---
cd models
python run_all_models.py

REM --- שלב 3: חישוב ציוני התאמה ---
python predict_player_positions.py
cd ..

REM --- שלב 4: העלאת האתר (שרת + פרונט) ---
npm run dev 