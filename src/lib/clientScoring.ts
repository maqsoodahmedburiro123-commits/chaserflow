import { Invoice, ClientScore, ClientTier, ClientRiskLevel } from '../types/chaserflow';

/**
 * Calculates payment performance and reliability scores for each client
 */
export function calculateAllClientScores(invoices: Invoice[]): ClientScore[] {
  const map = new Map<string, Invoice[]>();

  invoices.forEach((inv) => {
    const key = (inv.clientEmail || inv.clientName).toLowerCase().trim();
    const existing = map.get(key) || [];
    existing.push(inv);
    map.set(key, existing);
  });

  const results: ClientScore[] = [];

  map.forEach((clientInvoices) => {
    const first = clientInvoices[0];
    const clientName = first.clientName;
    const clientEmail = first.clientEmail;
    const clientCompany = first.clientCompany;

    const totalInvoiced = clientInvoices.reduce((sum, i) => sum + i.amount, 0);
    const paidInvoices = clientInvoices.filter((i) => i.status === 'paid');
    const totalPaid = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
    const outstandingAmount = totalInvoiced - totalPaid;
    const invoiceCount = clientInvoices.length;
    const paidCount = paidInvoices.length;
    const overdueInvoices = clientInvoices.filter((i) => i.status === 'overdue');
    const overdueCount = overdueInvoices.length;

    // Calculate on-time count
    let onTimeCount = 0;
    let totalDaysToSettle = 0;
    let settledDaysCount = 0;

    paidInvoices.forEach((inv) => {
      const issueTime = new Date(inv.issueDate).getTime();
      const dueTime = new Date(inv.dueDate).getTime();
      const paidTime = inv.paidDate ? new Date(inv.paidDate).getTime() : dueTime;

      // Was it settled on or before due date?
      if (paidTime <= dueTime + 86400000) {
        onTimeCount++;
      }

      // Calculate days to settle
      const days = Math.max(1, Math.round((paidTime - issueTime) / (1000 * 60 * 60 * 24)));
      totalDaysToSettle += days;
      settledDaysCount++;
    });

    const onTimeRate = paidCount > 0 ? Math.round((onTimeCount / paidCount) * 100) : 100;
    const avgDaysToPay = settledDaysCount > 0 ? Math.round(totalDaysToSettle / settledDaysCount) : 14;

    // Reliability Scoring algorithm (0 - 100)
    let score = 85; // Baseline

    // Positive contribution: High on-time rate
    score += (onTimeRate - 70) * 0.4;

    // Penalty for current overdue invoices
    score -= overdueCount * 22;

    // Penalty if reminders count is high across invoices
    const avgReminders = clientInvoices.reduce((s, i) => s + (i.remindersSentCount || 0), 0) / invoiceCount;
    if (avgReminders > 2) score -= 15;
    else if (avgReminders > 1) score -= 8;

    // Reward for multiple successful paid invoices
    if (paidCount >= 3) score += 10;
    else if (paidCount >= 1) score += 5;

    // Cap between 10 and 100
    score = Math.max(12, Math.min(100, Math.round(score)));

    // Tier mapping
    let tier: ClientTier = 'B';
    let riskLevel: ClientRiskLevel = 'medium';
    let recommendedTerms = 'Standard Net 14. Keep polite automatic chasers active.';
    let recommendedAction = 'Maintain standard automated reminder cadence.';

    if (score >= 90) {
      tier = 'A+';
      riskLevel = 'low';
      recommendedTerms = 'Net 30 eligible. Excellent payment track record; consider retainer discount.';
      recommendedAction = 'Safe for larger project scopes and post-billing.';
    } else if (score >= 78) {
      tier = 'A';
      riskLevel = 'low';
      recommendedTerms = 'Net 14 or Net 21. Dependable partner with prompt remittance.';
      recommendedAction = 'Standard chaser flow with friendly advance courtesy ping.';
    } else if (score >= 60) {
      tier = 'B';
      riskLevel = 'medium';
      recommendedTerms = 'Net 7 or Net 14. Requires regular reminder follow-up.';
      recommendedAction = 'Send advance reminder 3 days prior; ping on due date.';
    } else if (score >= 45) {
      tier = 'C';
      riskLevel = 'high';
      recommendedTerms = 'Require 50% upfront deposit. Milestone-gated deliverables only.';
      recommendedAction = 'Pause project deliverables if invoice becomes 7 days overdue.';
    } else {
      tier = 'D';
      riskLevel = 'critical';
      recommendedTerms = '100% advance upfront payment only. No open credit lines.';
      recommendedAction = 'Strict card-on-file or escrow before beginning work.';
    }

    results.push({
      clientEmail,
      clientName,
      clientCompany,
      score,
      tier,
      riskLevel,
      totalInvoiced,
      totalPaid,
      outstandingAmount,
      invoiceCount,
      paidCount,
      overdueCount,
      onTimeRate,
      avgDaysToPay,
      recommendedTerms,
      recommendedAction
    });
  });

  // Sort by score ascending (lowest/riskiest first) or highest outstanding
  return results.sort((a, b) => b.outstandingAmount - a.outstandingAmount || a.score - b.score);
}

/**
 * Get score for a specific client email
 */
export function getClientScoreByEmail(email: string, invoices: Invoice[]): ClientScore | undefined {
  const all = calculateAllClientScores(invoices);
  return all.find((c) => c.clientEmail.toLowerCase().trim() === email.toLowerCase().trim());
}
