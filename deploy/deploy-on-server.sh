#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/brok_site/current"
REPO_URL="https://github.com/lexcrirovs-prog/brok_site.git"

if [ ! -d "$APP_DIR/.git" ]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown -R "$USER":"$USER" /var/www/brok_site
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main

npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build

sudo mkdir -p /var/www/brok_site/current/storage/imports
sudo chown -R www-data:www-data /var/www/brok_site

sudo cp deploy/brok-site.service /etc/systemd/system/brok-site.service
sudo cp deploy/nginx-invest.conf /etc/nginx/sites-available/brok-site-invest.conf
sudo ln -sfn /etc/nginx/sites-available/brok-site-invest.conf /etc/nginx/sites-enabled/brok-site-invest.conf

sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable brok-site
sudo systemctl restart brok-site
sudo systemctl reload nginx

echo "Deployed to https://kotelgavno.ru/invest"
