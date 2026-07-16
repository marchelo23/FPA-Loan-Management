#!/bin/bash

# start.sh - Script para inicializar la Base de Datos y la API

echo "🚀 Iniciando el Sistema de Gestión de Préstamos..."

# Verifica si Docker está instalado y en ejecución
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor, instala Docker y docker-compose."
    exit 1
fi

echo "📦 Levantando la Base de Datos PostgreSQL con Docker (Puerto 5433)..."
sudo docker-compose up -d

echo "⏳ Esperando 5 segundos a que la base de datos esté lista..."
sleep 5

echo "📥 Instalando dependencias de Node.js (si es necesario)..."
npm install

echo "🟢 Iniciando la API en modo de desarrollo..."
echo "Podrás acceder a Swagger en: http://localhost:3000/api"
npm run start:dev
