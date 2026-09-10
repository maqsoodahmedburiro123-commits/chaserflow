import { Invoice, ChaserSettings, ReminderStage, EmailTone, CadenceStage } from '../types/chaserflow';

export const DEFAULT_CADENCE_STAGES: CadenceStage[] = [
  {
    id: 'cadence-1',
    name: 'Advance Courtesy Notice',
    offsetDays: -3,
    stage: 'upcoming_3d',
    tone: 'casual_polite',
    enabled: true,
    subjectPrefix: 'Friendly Heads-up',
    description: 'Sent 3 days prior to due date with convenient 1-click link.'
  },
  {
    id: 'cadence-2',
    name: 'Due Date Settlement Ping',
    offsetDays: 0,
    stage: 'due_today',
    tone: 'professional',
    enabled: true,
    subjectPrefix: 'Due Today',
    description: 'Polite reminder on the exact due date with Apple Pay & Card checkout.'
  },
  {
    id: 'cadence-3',
    name: 'Gentle Grace Period Nudge',
    offsetDays: 3,
    stage: 'overdue_3d',
    tone: 'professional',
    enabled: true,
    subjectPrefix: 'Checking In',
    description: 'Gentle inquiry asking if invoice was received or wired.'
  },
  {
    id: 'cadence-4',
    name: 'Firm Attention & Deliverables Hold',
    offsetDays: 7,
    stage: 'overdue_7d',
    tone: 'assertive_firm',
    enabled: true,
    subjectPrefix: 'Urgent Overdue',
    description: 'Direct note requesting immediate payment before pausing active deliverables.'
  },
  {
    id: 'cadence-5',
    name: 'Late Fee Assessment & Escalation',
    offsetDays: 14,
    stage: 'final_escalation',
    tone: 'assertive_firm',
    enabled: true,
    subjectPrefix: 'Final Notice',
    description: 'Final notice applying late fee policy and formal escalation.',
    applyLateFeeNotice: true
  }
];

export const DEFAULT_CHASER_SETTINGS: ChaserSettings = {
  userName: 'Alex Morgan',
  businessName: 'Morgan Studio & Design',
  userEmail: 'alex@morganstudio.dev',
  paymentInstructions: 'Pay online via credit card, Apple Pay, or wire to Chase account ending in ••4821.',
  defaultTone: 'professional',
  stripeConnected: true,
  enableLateFeeNotice: true,
  lateFeePercentage: 5,
  cadenceStages: DEFAULT_CADENCE_STAGES,
  dispatchWorkingHoursOnly: true,
  workHoursStart: '09:00',
  workHoursEnd: '17:00',
  skipWeekends: true,
  preferredSweetSpotTime: '10:00 AM'
};

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-088',
    clientName: 'Sarah Jenkins',
    clientCompany: 'Apex Marketing LLC',
    clientEmail: 'sarah.jenkins@apexmarketing.io',
    amount: 3450,
    currency: 'USD',
    issueDate: '2026-08-15',
    dueDate: '2026-08-30',
    status: 'overdue',
    serviceDescription: 'Brand Identity Redesign & Responsive Web UI Kit Deliverables',
    paymentLink: 'https://buy.stripe.com/mock_chaser_apex',
    remindersPaused: false,
    remindersSentCount: 2,
    lastReminderDate: '2026-09-02',
    nextScheduledReminderDate: '2026-09-06',
    notes: 'Client confirmed receipt of assets. Follow-up #2 dispatched on Sep 2.',
    reminderHistory: [
      {
        id: 'rem-1',
        timestamp: '2026-08-30 09:00 AM',
        stage: 'due_today',
        stageLabel: 'Due Date Notification',
        subject: 'Invoice INV-2026-088 is due today ($3,450.00)',
        recipientEmail: 'sarah.jenkins@apexmarketing.io',
        bodyPreview: 'Friendly reminder that your invoice for Brand Identity Redesign is due today...',
        status: 'delivered'
      },
      {
        id: 'rem-2',
        timestamp: '2026-09-02 10:15 AM',
        stage: 'overdue_3d',
        stageLabel: '3 Days Overdue Notice',
        subject: 'Checking in: Invoice INV-2026-088 is now 3 days overdue',
        recipientEmail: 'sarah.jenkins@apexmarketing.io',
        bodyPreview: 'Hope you are having a great week. Checking in on payment for invoice INV-2026-088...',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-091',
    clientName: 'David Chen',
    clientCompany: 'Solaria Cloud Tech',
    clientEmail: 'd.chen@solariacloud.com',
    amount: 1800,
    currency: 'USD',
    issueDate: '2026-08-28',
    dueDate: '2026-09-07',
    status: 'due_soon',
    serviceDescription: 'Monthly Technical Consulting & Cloud Optimization (August)',
    paymentLink: 'https://buy.stripe.com/mock_chaser_solaria',
    remindersPaused: false,
    remindersSentCount: 1,
    lastReminderDate: '2026-09-04',
    nextScheduledReminderDate: '2026-09-07',
    notes: 'Reminder #1 (3 days before due date) sent on Sep 4.',
    reminderHistory: [
      {
        id: 'rem-3',
        timestamp: '2026-09-04 09:00 AM',
        stage: 'upcoming_3d',
        stageLabel: 'Upcoming (3 Days Prior)',
        subject: 'Upcoming: Invoice INV-2026-091 is due on Sep 7 ($1,800.00)',
        recipientEmail: 'd.chen@solariacloud.com',
        bodyPreview: 'Quick heads-up that your monthly consulting invoice will be due in 3 days...',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-093',
    clientName: 'Elena Rostova',
    clientCompany: 'Vanguard Retail Labs',
    clientEmail: 'elena@vanguardlabs.co',
    amount: 5200,
    currency: 'USD',
    issueDate: '2026-09-01',
    dueDate: '2026-09-15',
    status: 'pending',
    serviceDescription: 'Custom Next.js E-Commerce Microservice Integration (Phase 1)',
    paymentLink: 'https://buy.stripe.com/mock_chaser_vanguard',
    remindersPaused: false,
    remindersSentCount: 0,
    nextScheduledReminderDate: '2026-09-12',
    notes: 'New invoice generated. First automatic reminder scheduled for Sep 12.',
    reminderHistory: []
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2026-082',
    clientName: 'Marcus Vance',
    clientCompany: 'Kite Wave Media',
    clientEmail: 'marcus@kitewave.tv',
    amount: 2150,
    currency: 'USD',
    issueDate: '2026-08-01',
    dueDate: '2026-08-15',
    status: 'paid',
    paidDate: '2026-08-17',
    serviceDescription: 'Motion Graphics & Promotional Video Editing Suite',
    paymentLink: 'https://buy.stripe.com/mock_chaser_kitewave',
    remindersPaused: false,
    remindersSentCount: 2,
    lastReminderDate: '2026-08-16',
    notes: 'Paid 1 day after reminder #2. ChaserFlow auto-stopped pending sequences.',
    reminderHistory: [
      {
        id: 'rem-4',
        timestamp: '2026-08-15 08:30 AM',
        stage: 'due_today',
        stageLabel: 'Due Date Notification',
        subject: 'Invoice INV-2026-082 is due today ($2,150.00)',
        recipientEmail: 'marcus@kitewave.tv',
        bodyPreview: 'Invoice is due today for motion graphics editing...',
        status: 'delivered'
      },
      {
        id: 'rem-5',
        timestamp: '2026-08-16 11:00 AM',
        stage: 'overdue_3d',
        stageLabel: 'Follow-up Nudge',
        subject: 'Following up: Invoice INV-2026-082 payment link',
        recipientEmail: 'marcus@kitewave.tv',
        bodyPreview: 'Following up on yesterday\'s invoice. Click here to complete payment...',
        status: 'delivered'
      }
    ]
  }
];

export function generateEmailTemplate(
  invoice: Invoice,
  settings: ChaserSettings,
  stage: ReminderStage,
  customTone?: EmailTone
): { subject: string; body: string } {
  const tone = customTone || settings.defaultTone;
  const currencySymbol = invoice.currency === 'USD' ? '$' : invoice.currency;
  const formattedAmount = `${currencySymbol}${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  // Safe payment options & remittance information block (avoids risky phishing-prone payment links)
  const details = invoice.paymentDetails || settings.paymentDetails;
  const instructions = invoice.paymentInstructions || settings.paymentInstructions;
  
  const paymentSection = [
    `Payment Options & Remittance Information:`,
    details?.bankName ? `• Bank Wire / ACH: ${details.bankName} | Routing: ${details.routingNumber || '021000021'} | Acct: ${details.accountNumber || '•••• 4821'}` : `• Bank ACH / Wire Transfer: ${settings.businessName} (Ref: ${invoice.invoiceNumber})`,
    details?.swiftBic ? `• International SWIFT / BIC: ${details.swiftBic}` : null,
    details?.zelleEmailOrPhone ? `• Zelle Direct: ${details.zelleEmailOrPhone}` : null,
    details?.wiseTagOrEmail ? `• Wise Transfer: ${details.wiseTagOrEmail}` : null,
    details?.checkPayableTo ? `• Check Payable To: ${details.checkPayableTo}` : null,
    `• Remittance Reference: Invoice ${invoice.invoiceNumber}`,
    instructions ? `• Note: ${instructions}` : null
  ].filter(Boolean).join('\n');

  if (stage === 'upcoming_3d') {
    if (tone === 'casual_polite') {
      return {
        subject: `Friendly heads-up: Invoice ${invoice.invoiceNumber} is due on ${invoice.dueDate}`,
        body: `Hi ${invoice.clientName},\n\nHope you're having a wonderful week!\n\nJust sending a friendly heads-up that Invoice ${invoice.invoiceNumber} for "${invoice.serviceDescription}" (${formattedAmount}) will be due in 3 days on ${invoice.dueDate}.\n\n${paymentSection}\n\nPlease let me know if you have any questions or need anything else updated!\n\nBest regards,\n${settings.userName}\n${settings.businessName}`
      };
    } else if (tone === 'assertive_firm') {
      return {
        subject: `Payment Scheduled: Invoice ${invoice.invoiceNumber} due on ${invoice.dueDate} (${formattedAmount})`,
        body: `Dear ${invoice.clientName},\n\nThis is an advance notice that Invoice ${invoice.invoiceNumber} is scheduled for settlement on ${invoice.dueDate}.\n\nTotal Due: ${formattedAmount}\nService Rendered: ${invoice.serviceDescription}\n\n${paymentSection}\n\nPlease ensure payment is initiated before the due date to keep accounts current.\n\nSincerely,\n${settings.userName}\n${settings.businessName}`
      };
    } else {
      // professional
      return {
        subject: `Advance Notice: Invoice ${invoice.invoiceNumber} due on ${invoice.dueDate} (${formattedAmount})`,
        body: `Hello ${invoice.clientName},\n\nI hope this message finds you well.\n\nThis is a courtesy reminder that Invoice ${invoice.invoiceNumber} for ${invoice.serviceDescription} is due on ${invoice.dueDate}.\n\nAmount Due: ${formattedAmount}\n\n${paymentSection}\n\nThank you for your business and partnership.\n\nWarm regards,\n${settings.userName}\n${settings.businessName}`
      };
    }
  }

  if (stage === 'due_today') {
    if (tone === 'casual_polite') {
      return {
        subject: `Invoice ${invoice.invoiceNumber} is due today (${formattedAmount})`,
        body: `Hi ${invoice.clientName},\n\nHope your day is going well!\n\nJust a quick note that Invoice ${invoice.invoiceNumber} (${formattedAmount}) for ${invoice.serviceDescription} is due today.\n\n${paymentSection}\n\nOnce remitted, your receipt will be confirmed. Thank you!\n\nBest,\n${settings.userName}\n${settings.businessName}`
      };
    } else {
      return {
        subject: `Invoice ${invoice.invoiceNumber} Due Today: ${formattedAmount}`,
        body: `Dear ${invoice.clientName},\n\nThis email is to notify you that Invoice ${invoice.invoiceNumber} is due today, ${invoice.dueDate}.\n\nInvoice Amount: ${formattedAmount}\nScope of Work: ${invoice.serviceDescription}\n\n${paymentSection}\n\nPlease remit payment at your earliest convenience today to keep your account in good standing.\n\nThank you,\n${settings.userName}\n${settings.businessName}`
      };
    }
  }

  if (stage === 'overdue_3d') {
    if (tone === 'casual_polite') {
      return {
        subject: `Checking in: Invoice ${invoice.invoiceNumber} is a few days overdue (${formattedAmount})`,
        body: `Hi ${invoice.clientName},\n\nI know how busy things get! Just wanted to gently check in regarding Invoice ${invoice.invoiceNumber} (${formattedAmount}), which was due on ${invoice.dueDate}.\n\nCould you please confirm when payment is scheduled, using the remittance information below:\n\n${paymentSection}\n\nIf you've already sent it via wire or ACH, please let me know so I can mark it paid.\n\nThanks so much!\n${settings.userName}\n${settings.businessName}`
      };
    } else {
      return {
        subject: `OVERDUE: Payment reminder for Invoice ${invoice.invoiceNumber} (${formattedAmount})`,
        body: `Dear ${invoice.clientName},\n\nAccording to our records, we have not yet received payment for Invoice ${invoice.invoiceNumber} in the amount of ${formattedAmount}, which was due on ${invoice.dueDate}.\n\nOutstanding Balance: ${formattedAmount}\nWork Performed: ${invoice.serviceDescription}\n\n${paymentSection}\n\nIf there is an issue or if this invoice has already been scheduled through accounts payable, please update me.\n\nSincerely,\n${settings.userName}\n${settings.businessName}`
      };
    }
  }

  // overdue_7d / final_escalation
  return {
    subject: `URGENT: Invoice ${invoice.invoiceNumber} is now past due (${formattedAmount})`,
    body: `Dear ${invoice.clientName},\n\nDespite previous reminders, Invoice ${invoice.invoiceNumber} for ${formattedAmount} remains unpaid and is significantly past due (original due date: ${invoice.dueDate}).\n\n${settings.enableLateFeeNotice ? `Please note that in accordance with our terms of service, an overdue fee of ${settings.lateFeePercentage}% may apply if payment is not received within 48 hours.\n\n` : ''}${paymentSection}\n\nIf you need to arrange an alternate payment method or split schedule, please reply immediately to discuss.\n\nRegards,\n${settings.userName}\n${settings.businessName}`
  };
}
