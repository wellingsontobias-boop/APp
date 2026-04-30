export enum Role {
  ANALYST = 'Analyst',
  ADMIN = 'Admin',
}

export enum Status {
  PENDING_VALIDATION = 'Aguardando Validação',
  VALIDATED = 'Validado',
  REJECTED = 'Rejeitado',
  PENDING_APPROVAL = 'Aguardando Aprovação',
  APPROVED = 'Aprovado',
  REFUSED = 'Recusado',
}

export enum Medal {
  BRONZE = 'Bronze',
  SILVER = 'Prata',
  GOLD = 'Ouro',
  DIAMOND = 'Diamante',
}

export interface User {
  id: number;
  name: string;
  username: string;
  password?: string;
  role: Role;
  points: number;
}

export interface Action {
  id: number;
  category: string;
  description: string;
  points: number;
  validator: string;
}

export interface Prize {
  id: number;
  category: string;
  description: string;
  cost: number;
  benefit: string;
  icon?: string;
  imageUrl?: string;
}

export interface LoggedAction {
  id: number;
  userId: number;
  actionId: number;
  month: string; 
  notes: string;
  status: Status;
  validationDate?: string;
}

export interface Redemption {
  id: number;
  userId: number;
  prizeId: number;
  requestDate: string;
  status: Status;
  approvalDate?: string;
}

export interface HistoryEntry {
    month: string;
    pontosGanhos: number;
    pontosResgatados: number;
    medal?: Medal;
}

export interface AppNotification {
  id: number;
  senderId: number; // Admin User ID
  recipientId: number | 'all'; // Specific User ID or 'all'
  message: string;
  timestamp: string; // ISO Date String
  read: boolean;
}

export interface AdminSettings {
  actionsLockedUntil: string | null; // ISO Date string "YYYY-MM-DD"
  prizesLocked: boolean;
}

// --- Mission System Types ---

export enum MissionType {
  DAILY = 'Diária',
  WEEKLY = 'Semanal',
  MONTHLY = 'Mensal',
}

export enum MissionGoalType {
  LOG_ACTION_CATEGORY = 'LOG_ACTION_CATEGORY',
}

export interface MissionGoal {
  type: MissionGoalType;
  // For LOG_ACTION_CATEGORY
  category?: string;
  count: number;
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  type: MissionType;
  goal: MissionGoal;
  rewardPoints: number;
  isGlobal: boolean; // Applies to all users
}

export enum UserMissionProgressStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED', // Ready to be claimed
  CLAIMED = 'CLAIMED', // Reward received
}

export interface UserMissionProgress {
  userId: number;
  missionId: number;
  progress: number;
  status: UserMissionProgressStatus;
  period: string; // e.g., '2024-07-26' for daily, '2024-W30' for weekly, '2024-07' for monthly
}

// --- Special Events Types ---

export enum SpecialEventType {
  DOUBLE_POINTS_CATEGORY = 'Pontos em Dobro por Categoria',
}

export interface SpecialEvent {
  id: number;
  name: string;
  description: string;
  type: SpecialEventType;
  config: {
    category: string;
  };
  startDate: string; // ISO Date "YYYY-MM-DD"
  endDate: string; // ISO Date "YYYY-MM-DD"
}
