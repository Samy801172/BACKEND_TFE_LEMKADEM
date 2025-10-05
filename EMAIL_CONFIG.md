# Configuration Email - Kiwi Club

## Problème actuel
Les emails de facture ne sont pas envoyés car le service mail est en mode test.

## Solution

### 1. Configuration Mailtrap (Développement)

Créer un fichier `.env` dans le dossier `api/` avec :

```bash
# Email - Mailtrap (développement)
MAILTRAP_USER=7fa7ac39aba9b7
MAILTRAP_PASS=b7297ce1cc7032
NODE_ENV=development
```

### 2. Vérifier la configuration

Le service mail utilise maintenant les variables d'environnement :
- `MAILTRAP_USER` : Utilisateur Mailtrap
- `MAILTRAP_PASS` : Mot de passe Mailtrap

### 3. Redémarrer l'API

```bash
cd api
npm run start:dev
```

### 4. Tester l'envoi d'emails

Les emails de facture seront maintenant envoyés via Mailtrap et visibles dans l'interface Mailtrap.

## Configuration Production

Pour la production, utiliser SendGrid :

```bash
SENDGRID_API_KEY=your_sendgrid_api_key
NODE_ENV=production
```