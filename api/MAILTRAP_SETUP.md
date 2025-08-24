# Configuration Mailtrap - Guide de Setup

## 🚀 Configuration Mailtrap (Développement)

### 1. Créer un compte Mailtrap

1. Allez sur [mailtrap.io](https://mailtrap.io)
2. Créez un compte gratuit
3. Créez une nouvelle inbox
4. Récupérez les identifiants SMTP :
   - **Host**: `sandbox.smtp.mailtrap.io`
   - **Port**: `587`
   - **Username**: Votre username Mailtrap
   - **Password**: Votre password Mailtrap

### 2. Créer le fichier `.env`

Créez un fichier `.env` dans le dossier `api/` avec le contenu suivant :

```env
# Configuration Mailtrap pour le développement
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASS=your_mailtrap_password
MAILTRAP_INBOX_ID=your_inbox_id

# Configuration SendGrid pour la production (optionnel)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Environnement
NODE_ENV=development

# Autres variables d'environnement existantes...
JWT_TOKEN_SECRET=your_jwt_secret_here_min_32_characters
JWT_REFRESH_TOKEN_SECRET=your_jwt_refresh_secret_here_min_32_characters
JWT_TOKEN_EXPIRE_IN=1h
JWT_REFRESH_TOKEN_EXPIRE_IN=7d

# Stripe (si utilisé)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_db_password_here
DB_DATABASE=kiwi_club_db
```

### 3. Remplacer les valeurs

Remplacez dans le fichier `.env` :
- `your_mailtrap_username` par votre username Mailtrap
- `your_mailtrap_password` par votre password Mailtrap
- `your_inbox_id` par l'ID de votre inbox (optionnel)

### 4. Redémarrer l'API

```bash
cd api
npm run start:dev
```

## 🔄 Changements Effectués

### Avant (Ethereal)
- ❌ URLs Ethereal dans les logs
- ❌ Configuration Ethereal automatique
- ❌ Pas de contrôle sur les emails

### Après (Mailtrap)
- ✅ URLs Mailtrap dans les logs
- ✅ Configuration Mailtrap explicite
- ✅ Interface web pour visualiser les emails
- ✅ Gestion des inbox multiples

## 📧 Utilisation

### 1. Envoi d'emails
Les emails sont automatiquement envoyés via Mailtrap en développement.

### 2. Visualisation
- Allez sur [mailtrap.io](https://mailtrap.io)
- Connectez-vous à votre compte
- Ouvrez votre inbox
- Visualisez tous les emails envoyés

### 3. Interface Admin
- Connectez-vous en tant qu'admin
- Allez dans la section "📧 Emails"
- Cliquez sur les liens Mailtrap pour ouvrir directement votre inbox

## 🚨 Dépannage

### Problème : "Transporter non initialisé"
- Vérifiez que le fichier `.env` existe
- Vérifiez que `MAILTRAP_USER` et `MAILTRAP_PASS` sont définis
- Redémarrez l'API

### Problème : "Erreur d'authentification"
- Vérifiez vos identifiants Mailtrap
- Vérifiez que votre compte Mailtrap est actif

### Problème : "Emails non visibles"
- Vérifiez que vous êtes connecté au bon compte Mailtrap
- Vérifiez que vous regardez la bonne inbox

## 🔧 Configuration Avancée

### Variables d'environnement disponibles

```env
# Mailtrap
MAILTRAP_USER=your_username
MAILTRAP_PASS=your_password
MAILTRAP_INBOX_ID=your_inbox_id

# SendGrid (production)
SENDGRID_API_KEY=your_api_key

# Environnement
NODE_ENV=development|production
```

### Logs de debug

Les logs affichent maintenant :
```
✅ Transporter Mailtrap initialisé pour le développement
✅ Email envoyé avec succès à user@example.com
🔗 Aperçu Mailtrap: https://mailtrap.io/inboxes/default/messages
```

## 📈 Avantages de Mailtrap

1. **Interface web** pour visualiser les emails
2. **Gestion des inbox** multiples
3. **Statistiques** d'envoi
4. **Tests automatisés** possibles
5. **API** pour récupérer les emails
6. **Gratuit** pour le développement

---

**Note** : Mailtrap est utilisé uniquement en développement. En production, le système utilise SendGrid. 