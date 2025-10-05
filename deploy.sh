#!/bin/bash

echo "🚀 Déploiement du backend Kiwi Club sur Render..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire api/"
    exit 1
fi

# Vérifier que render.yaml existe
if [ ! -f "render.yaml" ]; then
    echo "❌ Erreur: render.yaml non trouvé. Ce fichier est nécessaire pour le déploiement automatique."
    exit 1
fi

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm ci

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
echo ""
echo "🎯 MÉTHODE RECOMMANDÉE - Déploiement automatique avec render.yaml:"
echo "1. Allez sur https://dashboard.render.com"
echo "2. Cliquez sur 'New +' puis 'Blueprint'"
echo "3. Connectez votre repository GitHub: Samy801172/BACKEND_TFE_LEMKADEM"
echo "4. Render détectera automatiquement le fichier render.yaml"
echo "5. Cliquez sur 'Apply' pour créer le service et la base de données"
echo ""
echo "🔧 Variables d'environnement à configurer dans Render:"
echo "- SENDGRID_API_KEY: Votre clé API SendGrid"
echo "- STRIPE_SECRET_KEY: Votre clé secrète Stripe"
echo "- STRIPE_WEBHOOK_SECRET: Votre secret webhook Stripe"
echo "- FIREBASE_PRIVATE_KEY: Votre clé privée Firebase"
echo ""
echo "🌐 URLs importantes après déploiement:"
echo "- API: https://kiwi-club-backend.onrender.com/api"
echo "- Documentation Swagger: https://kiwi-club-backend.onrender.com/api/docs"
echo "- Health Check: https://kiwi-club-backend.onrender.com/api"
echo ""
echo "📱 Configuration CORS:"
echo "Votre API acceptera les requêtes depuis:"
echo "- https://samy801172.github.io (GitHub Pages)"
echo "- Tous les ports localhost (développement Flutter/Angular)"
echo ""
echo "✅ Script de déploiement terminé!"

