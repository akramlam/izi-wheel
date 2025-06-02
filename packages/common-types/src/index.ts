// Role types
export enum Role {
  SUPER = 'SUPER',
  ADMIN = 'ADMIN',
  SUB = 'SUB'
}

// Plan types
export enum Plan {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM'
}

// Wheel mode types
export enum WheelMode {
  ALL_WIN = 'ALL_WIN',
  RANDOM_WIN = 'RANDOM_WIN'
}

// Play result types
export enum PlayResult {
  WIN = 'WIN',
  LOSE = 'LOSE'
}

// User interface
export interface User {
  id: string;
  email: string;
  role: Role;
  companyId?: string;
  createdAt: Date;
}

// Company interface
export interface Company {
  id: string;
  name: string;
  plan: Plan;
  maxWheels: number;
  isActive: boolean;
  createdAt: Date;
}

// Wheel interface
export interface Wheel {
  id: string;
  companyId: string;
  name: string;
  mode: WheelMode;
  formSchema: Record<string, any>;
  isActive: boolean;
}

// Slot interface
export interface Slot {
  id: string;
  wheelId: string;
  label: string;
  weight: number;
  prizeCode: string;
}

// Play interface
export interface Play {
  id: string;
  wheelId: string;
  ip: string;
  createdAt: Date;
  prizeId?: string;
  result: PlayResult;
}

// Prize interface
export interface Prize {
  id: string;
  playId: string;
  pin: string;
  redeemedAt?: Date;
  qrLink: string;
} 