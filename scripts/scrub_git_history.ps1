# ===============================================================================
# SCRIPT SCRUB DỌN SẠCH TOÀN BỘ API KEY / SECRET KHỎI LỊCH SỬ GIT
# Dùng công cụ chuẩn git-filter-repo
# ===============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$RepoPath = "."
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  BẮT ĐẦU QUY TRÌNH DỌN SẠCH API KEYS KHỎI GIT HISTORY (GIT SCRUB)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$ExpressionsFile = "$PSScriptRoot\git_filter_secret_expressions.txt"
if (!(Test-Path $ExpressionsFile)) {
    Write-Error "Không tìm thấy file expressions tại: $ExpressionsFile"
    exit 1
}

# 1. Kiểm tra RepoPath
if (!(Test-Path "$RepoPath\.git")) {
    Write-Error "Thư mục '$RepoPath' không phải là một Git repository!"
    exit 1
}

Push-Location $RepoPath

try {
    Write-Host "`n[Bước 1] Kiểm tra trạng thái Git hiện tại..." -ForegroundColor Yellow
    $status = git status --porcelain
    if ($status) {
        Write-Warning "Working tree chưa commit hết. Đang commit tạm các thay đổi..."
        git add -A
        git commit -m "chore: save working changes before history scrub"
    }

    # 2. Tạo backup tag cho HEAD hiện tại phòng trường hợp cần khôi phục
    $backupTag = "backup-before-scrub-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    git tag $backupTag
    Write-Host "[Bước 2] Đã tạo Git tag backup an toàn: $backupTag" -ForegroundColor Green

    # 3. Lưu lại danh sách remote trước khi filter-repo xóa
    $remotes = git remote -v
    Write-Host "[Bước 3] Danh sách remotes hiện tại:" -ForegroundColor Yellow
    Write-Host $remotes

    # 4. Chạy git-filter-repo với file expressions
    Write-Host "`n[Bước 4] Đang chạy git-filter-repo để scrub các API key..." -ForegroundColor Cyan
    python -m git_filter_repo --replace-text $ExpressionsFile --force

    Write-Host "`n[Bước 5] Đã scrub toàn bộ commit history thành công!" -ForegroundColor Green
    Write-Host "Các chuỗi API Key và Token đã được thay thế thành ***REMOVED*** trên mọi commit." -ForegroundColor Green

    Write-Host "`n==================================================================" -ForegroundColor Yellow
    Write-Host "  BƯỚC TIẾP THEO (FORCE PUSH LÊN REMOTE):" -ForegroundColor Yellow
    Write-Host "==================================================================" -ForegroundColor Yellow
    Write-Host "Lưu ý: git-filter-repo tự động gỡ remote để phòng ngừa push nhầm."
    Write-Host "Để cập nhật lại lên remote và đóng alert bảo mật, chạy lệnh:" -ForegroundColor White
    Write-Host "  git remote add origin <URL_REPO_CUA_BAN>" -ForegroundColor Cyan
    Write-Host "  git push origin --force --all" -ForegroundColor Cyan
    Write-Host "  git push origin --force --tags" -ForegroundColor Cyan
    Write-Host "==================================================================" -ForegroundColor Yellow
}
finally {
    Pop-Location
}
