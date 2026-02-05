#!/bin/bash

echo "🚀 Iniciando Backend - Sistema de Vereadores"
echo "=============================================="
echo ""

# Carregar variáveis de ambiente
export $(cat .env | xargs)

echo "📦 Compilando projeto..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Compilação concluída com sucesso!"
    echo ""
    echo "🔄 Iniciando servidor..."
    echo ""
    node dist/main.js
else
    echo "❌ Erro na compilação!"
    exit 1
fi
