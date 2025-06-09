# 🖥️ Windows Setup Guide - REPOSITION Football Analytics

## להפעלה ב-Windows

### דרך 1: באמצעות setup.bat (מומלץ)
```cmd
# לחץ עם לחיצה כפולה על setup.bat
# או פתח Command Prompt והרץ:
setup.bat
```

### דרך 2: התקנה ידנית

#### 1. התקן Node.js
הורד והתקן מ: https://nodejs.org
- בחר ב-LTS version (גרסה יציבה)
- בחר "Add to PATH" בזמן ההתקנה

#### 2. התקן PostgreSQL
הורד מ: https://www.postgresql.org/download/windows/
- זכור את הסיסמה שתגדיר ל-postgres user
- התקן גם pgAdmin אם אתה רוצה ממשק גרפי

#### 3. פתח Command Prompt כמנהל
```cmd
# בדוק שהכל מותקן
node --version
npm --version
psql --version
```

#### 4. הכן את הפרוייקט
```cmd
# נווט לתיקיית הפרוייקט
cd C:\path\to\reposition-football-analytics

# התקן תלויות
npm install

# הכן קובץ הגדרות
copy .env.example .env
```

#### 5. הכן בסיס נתונים
פתח SQL Shell (psql) או pgAdmin והרץ:
```sql
CREATE DATABASE reposition_db;
CREATE USER reposition_user WITH PASSWORD 'yourpassword123';
GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;
```

#### 6. ערוך את קובץ .env
פתח את .env בעורך טקסט ועדכן:
```
DATABASE_URL=postgresql://reposition_user:yourpassword123@localhost:5432/reposition_db
PGHOST=localhost
PGPORT=5432
PGDATABASE=reposition_db
PGUSER=reposition_user
PGPASSWORD=yourpassword123
SESSION_SECRET=some-very-long-random-string-here
NODE_ENV=development
```

#### 7. אתחל בסיס נתונים והפעל
```cmd
npm run db:push
npm run dev
```

## פתרון בעיות נפוצות ב-Windows

### Node.js לא מזוהה
```cmd
# הוסף Node.js ל-PATH באופן ידני:
# Control Panel > System > Advanced > Environment Variables
# הוסף: C:\Program Files\nodejs\ ל-PATH
```

### PostgreSQL לא עובד
```cmd
# הפעל את שירות PostgreSQL:
# Win+R > services.msc > PostgreSQL > Start
# או דרך pgAdmin
```

### שגיאת הרשאות
```cmd
# הרץ Command Prompt כמנהל (Run as Administrator)
```

### Port 5000 תפוס
```cmd
# מצא ועצור תהליכים שמשתמשים בפורט 5000:
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

## כלים מומלצים לWindows

### עורכי טקסט
- **Visual Studio Code** (מומלץ): https://code.visualstudio.com/
- **Notepad++**: https://notepad-plus-plus.org/

### Terminal משופר
- **Windows Terminal**: מחנות Microsoft Store
- **Git Bash**: נכלל עם Git for Windows

### כלי פיתוח
- **Git for Windows**: https://git-scm.com/download/win
- **pgAdmin**: לניהול PostgreSQL

## הפעלה מהירה

אחרי התקנה ראשונית, פשוט הרץ בכל פעם:
```cmd
cd C:\path\to\reposition-football-analytics
npm run dev
```

האתר יפתח ב: http://localhost:5000

## עצות לפיתוח ב-Windows

1. **השתמש בTerminal טוב**: Windows Terminal או Git Bash
2. **הפעל כמנהל**: אם יש בעיות הרשאות
3. **הוסף לאנטי-וירוס**: הוסף את תיקיית הפרוייקט לחריגים
4. **עדכן PATH**: ודא שNode.js ו-PostgreSQL ב-PATH
5. **השתמש ב-WSL**: לחוויה דמוית Linux (אופציונלי)

## WSL (Windows Subsystem for Linux) - מתקדם

אם אתה רוצה חוויה דמוית Linux:
```powershell
# התקן WSL2
wsl --install

# התקן Ubuntu
wsl --install -d Ubuntu

# בתוך WSL:
sudo apt update
sudo apt install nodejs npm postgresql
```

עם WSL תוכל להשתמש בסקריפט setup.sh הרגיל.