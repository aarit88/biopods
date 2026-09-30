import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'OBSERVER';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'biopods-production-neural-key-9921';

// Seeded users with hashed passwords (PBKDF2 with SHA-256)
const usersDatabase: Map<string, { user: AuthUser; passwordHash: string; salt: string }> = new Map();

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
}

function initializeUsers() {
  const adminSalt = 'salt-bio-admin';
  usersDatabase.set('admin@biopods.io', {
    user: {
      id: 'usr-admin-01',
      email: 'admin@biopods.io',
      fullName: 'System Administrator',
      role: 'ADMIN',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
    salt: adminSalt,
    passwordHash: hashPassword('password', adminSalt),
  });

  const operatorSalt = 'salt-bio-operator';
  usersDatabase.set('operator@biopods.io', {
    user: {
      id: 'usr-operator-02',
      email: 'operator@biopods.io',
      fullName: 'Cluster Ops Engineer',
      role: 'OPERATOR',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=operator',
    },
    salt: operatorSalt,
    passwordHash: hashPassword('password', operatorSalt),
  });

  const observerSalt = 'salt-bio-observer';
  usersDatabase.set('observer@biopods.io', {
    user: {
      id: 'usr-observer-03',
      email: 'observer@biopods.io',
      fullName: 'Site Reliability Observer',
      role: 'OBSERVER',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=observer',
    },
    salt: observerSalt,
    passwordHash: hashPassword('password', observerSalt),
  });
}

initializeUsers();

export class AuthService {
  public static verifyCredentials(email: string, password: string):AuthUser | null {
    const record = usersDatabase.get(email);
    if (!record) return null;
    const computedHash = hashPassword(password, record.salt);
    if (computedHash === record.passwordHash) {
      return record.user;
    }
    return null;
  }

  public static generateTokens(user: AuthUser): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.fullName },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
  }

  public static verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        id: decoded.id,
        email: decoded.email,
        fullName: decoded.name || 'User',
        role: decoded.role || 'OBSERVER',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${decoded.email}`,
      };
    } catch {
      return null;
    }
  }

  public static requireRole(minimumRole: UserRole) {
    const roleHierarchy: Record<UserRole, number> = {
      OBSERVER: 1,
      OPERATOR: 2,
      ADMIN: 3,
    };

    return (req: any, res: any, next: any) => {
      const user: AuthUser = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
      }

      if (roleHierarchy[user.role] < roleHierarchy[minimumRole]) {
        return res.status(403).json({
          error: `Forbidden. Required privilege: ${minimumRole}. Current: ${user.role}.`,
        });
      }

      next();
    };
  }
}
