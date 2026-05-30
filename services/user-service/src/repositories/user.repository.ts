import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '@leave-mgmt/shared';

export type NewUser = Omit<User, 'id' | 'createdAt'>;

const users = new Map<string, User>();

function seedUsers(): void {
  const passwordHash = bcrypt.hashSync('password123', 10);
  const createdAt = new Date().toISOString();

  const seedData: User[] = [
    {
      id: 'emp-001',
      name: 'Alice Johnson',
      email: 'alice@company.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: 'mgr-001',
      createdAt,
    },
    {
      id: 'emp-002',
      name: 'Bob Smith',
      email: 'bob@company.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: 'mgr-001',
      createdAt,
    },
    {
      id: 'mgr-001',
      name: 'Charlie Manager',
      email: 'charlie@company.com',
      passwordHash,
      role: UserRole.MANAGER,
      createdAt,
    },
  ];

  for (const user of seedData) {
    users.set(user.id, user);
  }
}

seedUsers();

export function findByEmail(email: string): User | undefined {
  for (const user of users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return undefined;
}

export function findById(id: string): User | undefined {
  return users.get(id);
}

export function findAll(): User[] {
  return Array.from(users.values());
}

export function save(user: NewUser): User {
  const newUser: User = {
    ...user,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  users.set(newUser.id, newUser);
  return newUser;
}
