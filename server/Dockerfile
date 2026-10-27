FROM python:3.11-slim

# Cài đặt FFmpeg, Node.js và các thư viện C/C++ cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài đặt Python AI dependencies (PyTorch CPU)
COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Cài đặt Node.js dependencies
COPY package*.json ./
RUN npm install --production

# Sao chép toàn bộ mã nguồn server
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
