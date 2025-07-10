# Fix: Sous-administrateurs ne reçoivent pas d'emails

## Problème Identifié

Les sous-administrateurs ne reçoivent pas d'email lors de leur création avec mot de passe temporaire.

## Cause Racine

Après analyse du code, le problème se trouve dans la configuration SMTP du serveur API. Voici les éléments identifiés :

### 1. Configuration SMTP Manquante

Dans `apps/api/src/utils/mailer.ts`, la fonction vérifie si SMTP est configuré :

```javascript
const isSmtpConfigured = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS;
```

Les valeurs par défaut sont :
- `SMTP_HOST` = `'smtp.smtp.com'`
- `SMTP_PORT` = `2525`
- `SMTP_USER` = `''` (chaîne vide)
- `SMTP_PASS` = `''` (chaîne vide)

Comme `SMTP_USER` et `SMTP_PASS` sont des chaînes vides, `isSmtpConfigured` retourne `false`.

### 2. Mode Test Activé

Quand SMTP n'est pas configuré, le mailer utilise le mode test :

```javascript
if (!isSmtpConfigured) {
  console.log(`[TEST MODE] Invitation email would be sent to ${email} with password ${password}`);
  if (emailLogId) {
    await updateEmailStatus(emailLogId, EmailStatus.SENT, 'test-mode');
  }
  return;
}
```

L'email est marqué comme "envoyé" mais n'est pas réellement envoyé.

### 3. Fichier .env Manquant

Il n'y a pas de fichier `.env` dans `apps/api/` pour configurer les variables d'environnement SMTP.

## ✅ Actions Immédiates Prises

### 1. Fichier .env Créé/Mis à Jour

Le fichier `apps/api/.env` a été configuré pour utiliser MailHog (développement) :

```env
# Configuration SMTP pour MailHog (développement)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASS=test
SMTP_SECURE=false

# Configuration pour les emails
EMAIL_FROM=noreply@izikado.fr
EMAIL_FROM_NAME=IZI Kado

# URL frontend
FRONTEND_URL=https://roue.izikado.fr
```

### 2. Exemple de Configuration Production

Créé `apps/api/.env.production.example` avec la configuration SMTP.com pour la production.

## Solution

### Étape 1 : Créer le fichier de configuration

Créer un fichier `apps/api/.env` avec la configuration MailHog (pour le développement) :

```env
# Configuration SMTP pour MailHog (développement)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASS=test
SMTP_SECURE=false

# Configuration pour les emails
EMAIL_FROM=noreply@izikado.fr
EMAIL_FROM_NAME=IZI Kado

# URL frontend
FRONTEND_URL=https://roue.izikado.fr
```

### Étape 2 : Configuration Production

Pour la production, utiliser les vraies credentials SMTP :

```env
# Configuration SMTP pour production
SMTP_HOST=smtp.smtp.com
SMTP_PORT=2525
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_SECURE=false

# Ou utiliser l'API SMTP.com
USE_SMTP_COM_API=true
SMTP_COM_API_KEY=your-api-key
```

### Étape 3 : Vérification

Après avoir configuré les variables d'environnement :

1. Redémarrer le serveur API
2. Créer un nouveau sous-administrateur
3. Vérifier les logs pour confirmer l'envoi d'email
4. Pour le développement, vérifier MailHog sur `http://localhost:8025`

## Code Impliqué

### Contrôleur : `apps/api/src/controllers/user.controller.ts`

La fonction `inviteUser` (ligne 95) appelle `sendInviteEmail` :

```javascript
await sendInviteEmail(email, tempPassword, company.name, adminName, name, companyId, user.id);
```

### Mailer : `apps/api/src/utils/mailer.ts`

La fonction `sendInviteEmail` (ligne 261) gère l'envoi d'emails avec gestion d'erreurs.

### Frontend : `apps/web/src/pages/SubAdminManager.tsx`

Le frontend appelle `api.createUser()` (ligne 198) et affiche toujours le message de succès même si l'email n'est pas envoyé.

## Test de Validation

Pour vérifier que le fix fonctionne :

1. Créer un sous-administrateur via l'interface
2. Vérifier les logs du serveur API pour :
   - `[EMAIL] ✅ Mailer initialized: Using traditional SMTP (localhost:1025)`
   - `[SMTP] ✅ Email sent successfully on port 1025`
3. Vérifier MailHog sur `http://localhost:8025` pour voir l'email
4. Vérifier que le sous-administrateur peut se connecter avec le mot de passe temporaire

## Impact

- ✅ Les sous-administrateurs recevront leurs emails d'invitation
- ✅ Les mots de passe temporaires seront communiqués
- ✅ Le processus d'onboarding sera complet
- ✅ Les logs fourniront une visibilité sur l'envoi d'emails

## Prochaines Étapes

1. **Redémarrer le serveur API** pour que les nouvelles variables d'environnement prennent effet
2. **Tester la création d'un sous-administrateur** dans l'interface
3. **Vérifier MailHog** sur `http://localhost:8025` pour voir l'email reçu
4. **Configurer SMTP.com** pour la production si nécessaire