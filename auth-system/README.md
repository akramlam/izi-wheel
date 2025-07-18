# Système d'Authentification Réutilisable

Un système d'authentification complet avec JWT, gestion des rôles, et composants React prêts à l'emploi.

## 🚀 Fonctionnalités

- **Authentification JWT** : Tokens sécurisés avec expiration configurable
- **Gestion des rôles** : SUPER, ADMIN, SUB, USER avec permissions granulaires
- **Middleware Express** : Protection des routes avec vérification des rôles
- **Composants React** : Contexte d'auth, composants de login/register
- **Validation** : Schémas de validation avec Zod
- **Sécurité** : Hachage bcrypt, validation des mots de passe
- **TypeScript** : Entièrement typé pour une meilleure DX

## 📦 Installation

```bash
npm install @your-org/auth-system
```

## 🔧 Configuration Backend

### 1. Variables d'environnement

```env
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
```

### 2. Middleware Express

```typescript
import express from 'express';
import { authMiddleware, roleGuard } from '@your-org/auth-system/backend/middleware/auth.middleware';
import { Role } from '@your-org/auth-system/shared/types';

const app = express();

// Route protégée - authentification requise
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Route admin seulement
app.get('/admin', authMiddleware, roleGuard([Role.ADMIN, Role.SUPER]), (req, res) => {
  res.json({ message: 'Accès admin autorisé' });
});

// Route avec garde d'entreprise
app.get('/company/:companyId/data', 
  authMiddleware, 
  roleGuard([Role.ADMIN, Role.SUB]),
  companyGuard,
  (req, res) => {
    res.json({ message: 'Données de l\'entreprise' });
  }
);
```

### 3. Contrôleur d'authentification

```typescript
import { Request, Response } from 'express';
import { generateToken } from '@your-org/auth-system/backend/utils/jwt';
import { hashPassword, comparePassword } from '@your-org/auth-system/backend/utils/auth';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // Trouver l'utilisateur dans votre DB
  const user = await findUserByEmail(email);
  
  if (!user || !await comparePassword(password, user.password)) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  
  const token = generateToken(user);
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      // ... autres champs
    },
    token
  });
};
```

## ⚛️ Configuration Frontend

### 1. Contexte d'authentification

```typescript
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@your-org/auth-system/frontend/contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <YourApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 2. Hook d'authentification

```typescript
import { useAuth } from '@your-org/auth-system/frontend/hooks/useAuth';

function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Non connecté</div>;
  }
  
  return (
    <div>
      <h1>Bonjour {user?.name}</h1>
      <button onClick={logout}>Déconnexion</button>
    </div>
  );
}
```

### 3. Composant de protection de route

```typescript
import { ProtectedRoute } from '@your-org/auth-system/frontend/components/ProtectedRoute';
import { Role } from '@your-org/auth-system/shared/types';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={[Role.ADMIN, Role.SUPER]}>
          <AdminPanel />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

## 🔑 Utilisation des Rôles

### Hiérarchie des rôles

1. **SUPER** : Accès complet à tout le système
2. **ADMIN** : Gestion d'une entreprise
3. **SUB** : Sous-administrateur avec accès limité
4. **USER** : Utilisateur standard

### Exemples d'utilisation

```typescript
// Backend - Protection de route
app.get('/users', 
  authMiddleware, 
  roleGuard([Role.SUPER, Role.ADMIN]),
  getUsersController
);

// Frontend - Affichage conditionnel
function Navigation() {
  const { user } = useAuth();
  
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      {user?.role === Role.SUPER && (
        <Link to="/admin">Administration</Link>
      )}
      {[Role.SUPER, Role.ADMIN].includes(user?.role) && (
        <Link to="/users">Utilisateurs</Link>
      )}
    </nav>
  );
}
```

## 🛡️ Sécurité

### Bonnes pratiques

1. **Secret JWT** : Utilisez une clé secrète forte et unique
2. **Expiration** : Configurez une durée d'expiration appropriée
3. **HTTPS** : Utilisez toujours HTTPS en production
4. **Validation** : Validez tous les inputs côté backend
5. **Logs** : Loggez les tentatives d'authentification

### Configuration de production

```env
JWT_SECRET=your-super-strong-secret-key-minimum-32-characters
JWT_EXPIRES_IN=24h
NODE_ENV=production
```

## 📝 Exemples d'intégration

### Avec Prisma

```typescript
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  companyId String?
  isPaid    Boolean  @default(false)
  name      String?
  forcePasswordChange Boolean @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  SUPER
  ADMIN
  SUB
  USER
}
```

### Avec MongoDB/Mongoose

```typescript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['SUPER', 'ADMIN', 'SUB', 'USER'], default: 'USER' },
  companyId: { type: String },
  isPaid: { type: Boolean, default: false },
  name: { type: String },
  forcePasswordChange: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
});
```

## 🧪 Tests

```bash
npm test
```

## 📄 License

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour plus de détails. 