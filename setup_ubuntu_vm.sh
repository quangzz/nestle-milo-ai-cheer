#!/bin/bash
# ==============================================================================
# Script tự động cài đặt toàn bộ môi trường và khởi chạy Milo Backend Engine trên Ubuntu/Debian
# ==============================================================================

set -e

echo "🚀 [1/6] Đang cập nhật hệ thống apt..."
sudo apt update && sudo apt upgrade -y

echo "📦 [2/6] Cài đặt FFmpeg, Python 3, Git, Nginx và các công cụ hệ thống..."
sudo apt install -y curl wget git ffmpeg python3 python3-pip python3-venv libgl1-mesa-glx libglib2.0-0 nginx build-essential

echo "🟢 [3/6] Cài đặt Node.js v20 LTS và PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

echo "🧠 [4/6] Cài đặt PyTorch CPU và các gói AI Python..."
sudo pip3 install --upgrade pip --break-system-packages || true
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cpu --break-system-packages || pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip3 install opencv-python-headless pillow numpy rembg onnxruntime requests google-generativeai --break-system-packages || pip3 install opencv-python-headless pillow numpy rembg onnxruntime requests google-generativeai

echo "📂 [5/6] Cài đặt Node.js dependencies trong thư mục server..."
cd server
npm install --production

echo "⚙️ [6/6] Khởi chạy Milo Backend bằng PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup || true

echo "=============================================================================="
echo "🎉 HOÀN TẤT! Milo Backend Server đang chạy tại cổng 5000 bằng PM2."
echo "👉 Kiểm tra log: pm2 logs milo-backend"
echo "👉 Kiểm tra status: pm2 status"
echo "=============================================================================="
