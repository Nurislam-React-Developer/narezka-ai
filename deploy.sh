#!/bin/bash
set -e

SERVER="root@185.214.74.207"
PASS="tucYG3J3RX242"

echo "==========================================="
echo "🚀 Начало деплоя проекта на сервер $SERVER"
echo "==========================================="

echo "[1/4] Подготовка скрипта установки на сервере..."
cat << 'EOF' > install_on_server.sh
#!/bin/bash
set -e

echo "➡️ Обновление системы..."
apt-get update && apt-get upgrade -y
echo "➡️ Установка Node.js, Python, FFmpeg..."
apt-get install -y curl ffmpeg python3-venv python3-pip git ufw || true
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || true
apt-get install -y nodejs || true

echo "➡️ Установка PM2 (чтобы сайт работал 24/7)..."
npm install -g pm2 || true

echo "➡️ Настройка бэкенда (FastAPI)..."
cd /root/narezka/backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

echo "➡️ Настройка фронтенда (Next.js)..."
cd /root/narezka
npm install
npm run build

echo "➡️ Запуск процессов в фоне (PM2)..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

cd /root/narezka/backend
pm2 start "venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000" --name "api"

cd /root/narezka
pm2 start "npm start" --name "frontend" -- --port 3000

pm2 save
pm2 startup | tail -n 1 | bash || true

echo "➡️ Открытие портов в файрволе..."
ufw allow ssh
ufw allow 8000
ufw allow 3000
echo "y" | ufw enable || true

echo "✅ Сервер успешно настроен! Приложение теперь работает."
EOF

echo "[2/4] Копирование файлов проекта на сервер..."
# Копируем всё что нужно (без зависимостей)
/usr/bin/expect -c "
set timeout 300
spawn rsync -av -e {ssh -o StrictHostKeyChecking=no} --exclude node_modules --exclude .next --exclude backend/venv --exclude .git --exclude backend/inputs --exclude backend/outputs ./ $SERVER:/root/narezka/
expect {
    \"*?assword:*\" {
        send \"$PASS\r\"
        exp_continue
    }
    eof
}
"

echo "[3/4] Копирование установочного скрипта..."
/usr/bin/expect -c "
set timeout 30
spawn scp -o StrictHostKeyChecking=no install_on_server.sh $SERVER:/root/
expect {
    \"*?assword:*\" {
        send \"$PASS\r\"
        exp_continue
    }
    eof
}
"

echo "[4/4] Запуск установки на сервере (это может занять пару минут)..."
/usr/bin/expect -c "
set timeout 600
spawn ssh -o StrictHostKeyChecking=no $SERVER \"chmod +x /root/install_on_server.sh && /root/install_on_server.sh\"
expect {
    \"*?assword:*\" {
        send \"$PASS\r\"
        exp_continue
    }
    eof
}
"

# Подчищаем локальный файл
rm install_on_server.sh

echo "================================================="
echo "🎉 Готово! Проект загружен и работает на сервере."
echo "🌐 API (Бэкенд): http://185.214.74.207:8000"
echo "🌐 Сайт (Фронтенд): http://185.214.74.207:3000"
echo "================================================="
