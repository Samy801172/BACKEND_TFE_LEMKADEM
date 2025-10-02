#!/bin/bash

echo "🚀 Déploiement du backend Kiwi Club sur Render..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire api/"
    exit 1
fi

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Build du projet
echo "🔨 Build du projet..."
npm run build

# Vérifier que le build a réussi
if [ ! -d "dist" ]; then
    echo "❌ Erreur: Le build a échoué. Le dossier dist n'existe pas."
    exit 1
fi

echo "✅ Build terminé avec succès!"

# Instructions pour le déploiement
echo ""
echo "📋 Instructions pour déployer sur Render:"
echo "1. Allez sur https://dashboard.render.com"
echo "2. Cliquez sur 'New +' puis 'Web Service'"
echo "3. Connectez votre repository GitHub"
echo "4. Sélectionnez le dossier 'api' comme Root Directory"
echo "5. Utilisez les paramètres suivants:"
echo "   - Build Command: npm install && npm run build"
echo "   - Start Command: npm run start:prod"
echo "   - Health Check Path: /start/hello"
echo "6. Ajoutez les variables d'environnement nécessaires"
echo "7. Cliquez sur 'Create Web Service'"

echo ""
echo "🔧 Variables d'environnement requises:"
echo "- NODE_ENV=production"
echo "- PORT=10000"
echo "- DATABASE_URL=<votre-url-de-base-de-données>"
echo "- JWT_SECRET=<votre-secret-jwt>"
echo "- JWT_EXPIRES_IN=7d"
echo "- CORS_ORIGIN=https://kiwi-club-frontend.onrender.com,http://localhost:4200"
echo "- MAILTRAP_USER=09b04970de09d8"
echo "- MAILTRAP_PASS=ecf22b0f9ee9a0"

echo ""
echo "✅ Script de déploiement terminé!"

