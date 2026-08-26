@echo off
cd /d D:\ALL\projects\ICT_CENTER_INTERN\Stock-MS\stock-mgt-team-c\backend
echo === BACKEND TESTS === > ..\_test_out.txt
call npx vitest run --reporter=verbose >> ..\_test_out.txt 2>&1
echo === EXIT %ERRORLEVEL% === >> ..\_test_out.txt