#!/bin/bash
set -e

SERVER="root@185.214.74.207"
PASS="tucYG3J3RX242"

echo "🔄 Копирование файлов на сервер (исключаем зависимости)..."

/usr/bin/expect << 'EXPECT_EOF'
set timeout 600
spawn rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude backend/venv \
  --exclude .git \
  --exclude backend/inputs \
  --exclude backend/outputs \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ root@185.214.74.207:/root/narezka/

expect {
    "*?assword:*" {
        send "tucYG3J3RX242\r"
        exp_continue
    }
    eof
}
EXPECT_EOF

echo "✅ Файлы скопированы. Запуск npm build и перезагрузка сервисов..."

/usr/bin/expect << 'EXPECT_EOF'
set timeout 600
spawn ssh -o StrictHostKeyChecking=no root@185.214.74.207 bash << 'REMOTE_EOF'
cd /root/narezka
npm install
npm run build
pm2 stop frontend 2>/dev/null || true
pm2 start "npm start" --name "frontend" -- --port 3000 2>/dev/null || true
pm2 restart frontend
echo "✅ Фронтенд перезагружен!"
REMOTE_EOF

expect {
    "*?assword:*" {
        send "tucYG3J3RX242\r"
        exp_continue
    }
    eof
}
EXPECT_EOF

echo "🎉 Деплой завершён!"
