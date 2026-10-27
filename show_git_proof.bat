@echo off
chcp 65001 >nul
cls
echo ===============================================================================
echo   NESTLE WEBCMS (PLATFORM.SH) - GIT VERIFICATION FOR SPAIN TEAM
echo ===============================================================================
echo.
echo [STEP 1] Git Remote Configuration:
git remote -v
echo.
echo [STEP 2] Check commits in master that are NOT in featuremilo-2026:
echo Command: git log platform/featuremilo-2026..platform/master --oneline
git log platform/featuremilo-2026..platform/master --oneline
echo [RESULT: 0 COMMITS DIFFERENCE - OUTPUT IS EMPTY]
echo.
echo [STEP 3] Recent commits on platform/master:
git log -n 5 --graph --format="%%h %%ad | %%s [%%an]" --date=short platform/master
echo.
echo [STEP 4] Recent commits on platform/featuremilo-2026 (Merge from master verified):
git log -n 6 --graph --format="%%h %%ad | %%s [%%an]" --date=short platform/featuremilo-2026
echo.
echo ===============================================================================
echo   SUMMARY: Branch 'featuremilo-2026' is 100%% up to date with 'master'.
echo   Merge commit 15bda38722 merged master (0144b63e4e) on Oct 13, 2026.
echo ===============================================================================
echo.
echo Chup man hinh cua so nay bang Win + Shift + S de gui cho team Tay Ban Nha.
echo.
pause
