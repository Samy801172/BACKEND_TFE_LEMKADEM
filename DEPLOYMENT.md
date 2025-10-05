# 🚀 Guide de Déploiement - Backend Kiwi Club

Ce guide vous explique comment déployer le backend Kiwi Club sur Render.

## 📋 Prérequis

- Un compte GitHub avec le repository `Samy801172/BACKEND_TFE_LEMKADEM`
- Un compte Render (gratuit)
- Les clés API pour les services externes (Stripe, SendGrid, Firebase)

## 🎯 Déploiement Automatique (Recommandé)

### Étape 1: Préparation
1. Assurez-vous que tous vos changements sont commités et poussés sur GitHub
2. Vérifiez que le fichier `render.yaml` est présent dans votre repository

### Étape 2: Déploiement sur Render
1. Allez sur [https://dashboard.render.com](https://dashboard.render.com)
2. Cliquez sur **"New +"** puis **"Blueprint"**
3. Connectez votre repository GitHub: `Samy801172/BACKEND_TFE_LEMKADEM`
4. Render détectera automatiquement le fichier `render.yaml`
5. Cliquez sur **"Apply"** pour créer le service et la base de données

### Étape 3: Configuration des Variables d'Environnement
Dans le dashboard Render, ajoutez ces variables d'environnement :

#### Variables Obligatoires
```
SENDGRID_API_KEY=SG.your-actual-sendgrid-key
STRIPE_SECRET_KEY=sk_test_your-actual-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-actual-webhook-secret
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-actual-firebase-key\n-----END PRIVATE KEY-----
```

#### Variables Optionnelles (déjà configurées)
- `NODE_ENV=production`
- `PORT=10000`
- `JWT_SECRET` (généré automatiquement)
- `JWT_EXPIRES_IN=7d`
- `CORS_ORIGIN` (configuré pour GitHub Pages et localhost)
- `MAILTRAP_USER` et `MAILTRAP_PASS` (déjà configurés)

## 🌐 URLs après Déploiement

- **API Base URL**: `https://kiwi-club-backend.onrender.com/api`
- **Documentation Swagger**: `https://kiwi-club-backend.onrender.com/api/docs`
- **Health Check**: `https://kiwi-club-backend.onrender.com/api`

## 🔧 Configuration CORS

Votre API acceptera les requêtes depuis :
- `https://samy801172.github.io` (GitHub Pages)
- Tous les ports localhost (développement Flutter/Angular)
- Ports spécifiques : 4200, 3000, 56700, 56969, 59013, 60263, 61013, 8080

## 📱 Test du Déploiement

1. **Test de santé** : Visitez `https://kiwi-club-backend.onrender.com/api`
2. **Test Swagger** : Visitez `https://kiwi-club-backend.onrender.com/api/docs`
3. **Test CORS** : Depuis votre frontend, faites une requête vers l'API

## 🐛 Dépannage

### Problèmes Courants

1. **Erreur de build** : Vérifiez les logs dans Render Dashboard
2. **Erreur CORS** : Vérifiez que votre domaine est dans `CORS_ORIGIN`
3. **Erreur de base de données** : Vérifiez que `DATABASE_URL` est correctement configuré
4. **Erreur de variables d'environnement** : Vérifiez que toutes les clés API sont correctes

### Logs
- Consultez les logs dans le dashboard Render
- Les logs incluent les informations de démarrage, erreurs, et requêtes

## 🔄 Mise à Jour

Pour mettre à jour votre déploiement :
1. Committez vos changements sur GitHub
2. Render redéploiera automatiquement
3. Vérifiez les logs pour s'assurer que tout fonctionne

## 📞 Support

En cas de problème :
1. Consultez les logs Render
2. Vérifiez la configuration des variables d'environnement
3. Testez localement avec `npm run start:prod`

---

**Note** : Le déploiement utilise le plan gratuit de Render. Pour la production, considérez un plan payant pour de meilleures performances.
