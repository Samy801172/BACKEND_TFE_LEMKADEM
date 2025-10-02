# Script de déploiement pour Windows PowerShell
Write-Host "🚀 Déploiement du backend Kiwi Club sur Render..." -ForegroundColor Green

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire api/" -ForegroundColor Red
    exit 1
}

# Installer les dépendances
Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
npm install

# Build du projet
Write-Host "🔨 Build du projet..." -ForegroundColor Yellow
npm run build

# Vérifier que le build a réussi
if (-not (Test-Path "dist")) {
    Write-Host "❌ Erreur: Le build a échoué. Le dossier dist n'existe pas." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build terminé avec succès!" -ForegroundColor Green

# Instructions pour le déploiement
Write-Host ""
Write-Host "📋 Instructions pour déployer sur Render:" -ForegroundColor Cyan
Write-Host "1. Allez sur https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Cliquez sur 'New +' puis 'Web Service'" -ForegroundColor White
Write-Host "3. Connectez votre repository GitHub" -ForegroundColor White
Write-Host "4. Sélectionnez le dossier 'api' comme Root Directory" -ForegroundColor White
Write-Host "5. Utilisez les paramètres suivants:" -ForegroundColor White
Write-Host "   - Build Command: npm install && npm run build" -ForegroundColor Gray
Write-Host "   - Start Command: npm run start:prod" -ForegroundColor Gray
Write-Host "   - Health Check Path: /start/hello" -ForegroundColor Gray
Write-Host "6. Ajoutez les variables d'environnement nécessaires" -ForegroundColor White
Write-Host "7. Cliquez sur 'Create Web Service'" -ForegroundColor White

Write-Host ""
Write-Host "🔧 Variables d'environnement requises:" -ForegroundColor Cyan
Write-Host "- NODE_ENV=production" -ForegroundColor White
Write-Host "- PORT=10000" -ForegroundColor White
Write-Host "- DATABASE_URL=<votre-url-de-base-de-données>" -ForegroundColor White
Write-Host "- JWT_SECRET=<votre-secret-jwt>" -ForegroundColor White
Write-Host "- JWT_EXPIRES_IN=7d" -ForegroundColor White
Write-Host "- CORS_ORIGIN=https://kiwi-club-frontend.onrender.com,http://localhost:4200" -ForegroundColor White
Write-Host "- MAILTRAP_USER=09b04970de09d8" -ForegroundColor White
Write-Host "- MAILTRAP_PASS=ecf22b0f9ee9a0" -ForegroundColor White

Write-Host ""
Write-Host "✅ Script de déploiement terminé!" -ForegroundColor Green
