#!/bin/bash
# ==============================================================================
# Script cập nhật nhanh Milo Backend Server (1-Click Update & Restart)
# ==============================================================================

set -e

echo "🚀 [1/3] Đang kéo mã nguồn mới nhất từ GitHub (origin main)..."
cd /var/www/milo
git fetch origin main
git reset --hard origin/main

echo "📦 [2/3] Cập nhật dependencies Node.js..."
cd /var/www/milo/server
npm install --production

echo "🔄 [3/3] Khởi động lại dịch vụ backend PM2..."
pm2 restart milo-backend --update-env

echo "=============================================================================="
echo "🎉 HOÀN TẤT CẬP NHẬT! Server Milo Backend đã nạp 7 lớp Cache & Bản vá Bảo mật."
echo "=============================================================================="
pm2 status
