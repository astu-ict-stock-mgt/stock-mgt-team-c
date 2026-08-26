@echo off
cd /d D:\ALL\projects\ICT_CENTER_INTERN\Stock-MS\stock-mgt-team-c
echo === FRONTEND TSC === > _fe_build.txt
call npx tsc --noEmit >> _fe_build.txt 2>&1
echo === TSC EXIT %ERRORLEVEL% === >> _fe_build.txt
echo === NEXT BUILD === >> _fe_build.txt
call npm run build >> _fe_build.txt 2>&1
echo === BUILD EXIT %ERRORLEVEL% === >> _fe_build.txt