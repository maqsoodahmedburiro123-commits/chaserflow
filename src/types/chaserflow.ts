export type InvoiceStatus = 'paid' | 'pending' | 'due_soon' | 'overdue';

export type ReminderStage = 
  | 'upcoming_3d' 
  | 'due_today' 
  | 'overdue_3d' 
  | 'overdue_7d' 
  | 'final_escalation' 
  | 'manual';

export interface ReminderLog {
  id: string;
  timestamp: string;
  stage: ReminderStage;
  stageLabel: string;
  subject: string;
  recipientEmail: string;
  bodyPreview: string;
  status: 'sent' | 'delivered' | 'paid_halted';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paidDate?: string;
  serviceDescription: string;
  paymentLink: string;
  remindersPaused: boolean;
  remindersSentCount: number;
  lastReminderDate?: string;
  nextScheduledReminderDate?: string;
  reminderHistory: ReminderLog[];
  notes?: string;
}

export type EmailTone = 'casual_polite' | 'professional' | 'assertive_firm';

export interface CadenceStage {
  id: string;
  name: string;
  offsetDays: number; // e.g. -3 (3 days before due), 0 (due date), +3, +7, +14
  stage: ReminderStage;
  tone: EmailTone;
  enabled: boolean;
  subjectPrefix?: string;
  description: string;
  applyLateFeeNotice?: boolean;
}

export interface ChaserSettings {
  userName: string;
  businessName: string;
  userEmail: string;
  paymentInstructions: string;
  defaultTone: EmailTone;
  stripeConnected: boolean;
  enableLateFeeNotice: boolean;
  lateFeePercentage: number;
  
  // Custom Escalation Cadence
  cadenceStages?: CadenceStage[];

  // Smart Working Hours & Timing Dispatcher
  dispatchWorkingHoursOnly?: boolean;
  workHoursStart?: string; // e.g. "09:00"
  workHoursEnd?: string; // e.g. "17:00"
  skipWeekends?: boolean;
  preferredSweetSpotTime?: string; // e.g. "10:00 AM"
}

export type ClientTier = 'A+' | 'A' | 'B' | 'C' | 'D';
export type ClientRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ClientScore {
  clientEmail: string;
  clientName: string;
  clientCompany?: string;
  score: number; // 0 - 100
  tier: ClientTier;
  riskLevel: ClientRiskLevel;
  totalInvoiced: number;
  totalPaid: number;
  outstandingAmount: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
  onTimeRate: number; // percentage 0 - 100
  avgDaysToPay: number; // average days
  recommendedTerms: string;
  recommendedAction: string;
}
