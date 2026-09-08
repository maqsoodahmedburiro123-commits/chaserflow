import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// Helper to get GoogleGenAI client
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-chaserflow',
      },
    },
  });
}

// Resilient Gemini JSON caller with model fallback (3.8-flash -> flash-latest)
async function callGeminiJson<T>(
  ai: GoogleGenAI,
  prompt: string,
  models: string[] = ['gemini-3.8-flash', 'gemini-flash-latest']
): Promise<T | null> {
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      if (response.text) {
        return JSON.parse(response.text) as T;
      }
    } catch (err: any) {
      console.warn(`[Gemini] Model ${model} encountered an issue (${err?.status || err?.message || 'unknown'}). Trying fallback.`);
    }
  }
  return null;
}

// Fallback Generators for High-Demand Periods or Offline Mode
function getFallbackDraft(invoice: any, stage: string, customContext: string, strategy: string, settings: any) {
  const senderName = settings?.userName || 'The Team';
  const bizName = settings?.businessName || 'our agency';
  let subject = `Follow-up: Invoice ${invoice.invoiceNumber} for ${invoice.serviceDescription}`;
  let body = `Hi ${invoice.clientName},\n\nHope your week is going well.\n\nQuick follow-up regarding invoice ${invoice.invoiceNumber} ($${invoice.amount?.toLocaleString()} ${invoice.currency}) for ${invoice.serviceDescription}.\n\nYou can review and settle this securely here:\n${invoice.paymentLink}\n\n${customContext ? `Note: ${customContext}\n\n` : ''}Thanks so much,\n${senderName}\n${bizName}`;
  let smsSnippet = `Hi ${invoice.clientName}, quick note from ${bizName} regarding invoice ${invoice.invoiceNumber} ($${invoice.amount}). Secure link: ${invoice.paymentLink}`;
  let aiTip = 'Tip: Sending invoice reminders mid-morning (9:30 AM - 11:00 AM on Tuesdays or Thursdays) yields 38% higher response rates.';

  if (strategy === 'firm_contractual') {
    subject = `Action Required: Outstanding Invoice ${invoice.invoiceNumber} (${invoice.clientName})`;
    body = `Dear ${invoice.clientName},\n\nThis is a formal reminder that invoice ${invoice.invoiceNumber} in the amount of $${invoice.amount?.toLocaleString()} ${invoice.currency} is currently outstanding.\n\nPlease process this payment today via:\n${invoice.paymentLink}\n\n${customContext ? `${customContext}\n\n` : ''}If you have already initiated the transfer, please reply with the confirmation.\n\nSincerely,\n${senderName}\n${bizName}`;
    smsSnippet = `Important: Invoice ${invoice.invoiceNumber} ($${invoice.amount}) is overdue. Please settle today at: ${invoice.paymentLink}`;
    aiTip = 'Tip: Referencing the specific contract milestone and attaching bank remittance details reduces payment query delays.';
  } else if (strategy === 'split_payment_offer') {
    subject = `Flexible options for Invoice ${invoice.invoiceNumber} (${invoice.serviceDescription})`;
    body = `Hi ${invoice.clientName},\n\nWe understand that cash flow timing can vary. If settling the full $${invoice.amount?.toLocaleString()} for invoice ${invoice.invoiceNumber} is challenging right now, we are happy to offer a split payment (50% today, 50% in 14 days).\n\nPay initial portion here:\n${invoice.paymentLink}\n\n${customContext ? `${customContext}\n\n` : ''}Let us know if this works for you.\n\nBest regards,\n${senderName}\n${bizName}`;
    smsSnippet = `Hi ${invoice.clientName}, happy to offer a split payment on invoice ${invoice.invoiceNumber} ($${invoice.amount}) if helpful: ${invoice.paymentLink}`;
    aiTip = 'Tip: Offering a 50/50 installment plan recovers over 70% of delayed invoices within 48 hours without burning client rapport.';
  } else if (strategy === 'urgency_discount') {
    subject = `Time-sensitive: 3% prompt-settlement option for ${invoice.invoiceNumber}`;
    body = `Hi ${invoice.clientName},\n\nTo help close out our billing cycle smoothly, we are extending a 3% prompt-settlement concession if invoice ${invoice.invoiceNumber} ($${invoice.amount?.toLocaleString()}) is settled within the next 24 hours.\n\nDirect settlement link:\n${invoice.paymentLink}\n\n${customContext ? `${customContext}\n\n` : ''}Warm regards,\n${senderName}\n${bizName}`;
    smsSnippet = `Hi ${invoice.clientName}, settle invoice ${invoice.invoiceNumber} ($${invoice.amount}) today for a prompt-pay credit: ${invoice.paymentLink}`;
    aiTip = 'Tip: Small early-settlement concessions incentivize accounts payable to move you to the front of this week\'s payout queue.';
  }

  return {
    isFallback: true,
    subject,
    body,
    smsSnippet,
    aiTip,
    suggestedNextAction: 'Dispatch via email and follow up on WhatsApp in 48 hours if unopened.'
  };
}

function getFallbackParse(rawText: string) {
  const amountMatch = rawText.match(/\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|\b[0-9]+\b)/);
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 14);

  return {
    isFallback: true,
    extracted: {
      clientName: 'Client Contact',
      clientEmail: emailMatch ? emailMatch[0] : 'billing@client.com',
      clientCompany: 'Client Organization',
      amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 1500,
      currency: 'USD',
      dueDate: futureDate.toISOString().split('T')[0],
      serviceDescription: rawText.slice(0, 80).trim() || 'Design and consulting deliverables',
      notes: 'Auto-extracted from client message'
    }
  };
}

function getFallbackCounter(clientExcuse: string, invoice: any, senderName: string) {
  return {
    isFallback: true,
    options: [
      {
        title: 'Diplomatic Firm Boundary',
        tag: 'Firm & Professional',
        script: `Hi ${invoice?.clientName || 'there'},\n\nThank you for the update. I appreciate you letting me know about ${clientExcuse.slice(0, 40)}...\n\nBecause our contract terms specify net payment dates, can we confirm that funds will be transferred no later than this Friday? This ensures ongoing support remains uninterrupted.\n\nLink to settle: ${invoice?.paymentLink || 'https://checkout.stripe.com'}\n\nBest,\n${senderName}`,
        rationale: 'Acknowledges their situation while enforcing your agreed terms and pinning down an exact date.'
      },
      {
        title: 'Split Payment Settlement',
        tag: 'Win-Win Compromise',
        script: `Hi ${invoice?.clientName || 'there'},\n\nUnderstood. If processing the full $${invoice?.amount || 'total'} is difficult right now due to this, let's do this: process 50% ($${((invoice?.amount || 1000) / 2).toFixed(2)}) today to keep the account in good standing, and the balance in 14 days.\n\nHere is the link: ${invoice?.paymentLink || 'https://checkout.stripe.com'}\n\nThanks,\n${senderName}`,
        rationale: 'Eliminates all-or-nothing friction by securing partial cash immediately.'
      },
      {
        title: 'Executive / Accounting Escalation',
        tag: 'Process Focused',
        script: `Hi ${invoice?.clientName || 'there'},\n\nThanks for keeping me in the loop. Could you please connect me directly with your accounts payable lead or finance manager so I can provide any additional vendor documentation or tax forms they require to release payment this week?\n\nInvoice link: ${invoice?.paymentLink || 'https://checkout.stripe.com'}\n\nBest regards,\n${senderName}`,
        rationale: 'Bypasses the busy client contact to work directly with the person who holds the checkbook.'
      }
    ]
  };
}

function getFallbackRiskAnalysis(pendingInvoices: any[]) {
  const totalPending = pendingInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const analyzed = pendingInvoices.map(inv => {
    let riskScore = 20;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let recommendation = 'Standard polite reminder scheduled.';

    if (inv.status === 'overdue') {
      riskScore = 75 + Math.min((inv.remindersSentCount || 0) * 5, 20);
      riskLevel = 'high';
      recommendation = 'Urgent: Escalate via direct phone call or offer a 2-part installment settlement.';
    } else if (inv.status === 'due_soon') {
      riskScore = 45;
      riskLevel = 'medium';
      recommendation = 'Send courteous WhatsApp/SMS heads-up with 1-click pay link.';
    }

    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      amount: inv.amount,
      riskScore,
      riskLevel,
      recommendation
    };
  });

  return {
    isFallback: true,
    totalAtRisk: totalPending,
    overallHealthScore: Math.max(10, 100 - (pendingInvoices.filter(i => i.status === 'overdue').length * 25)),
    executiveSummary: `You have $${totalPending.toLocaleString()} in uncollected receivables across ${pendingInvoices.length} active invoices. Prioritize immediate contact with overdue accounts to prevent aging beyond 14 days.`,
    analyzedInvoices: analyzed
  };
}

// 1. AI Draft Reminder Route
app.post('/api/ai/draft-chaser', async (req, res) => {
  try {
    const { 
      invoice, 
      stage, 
      customContext, 
      strategy = 'polite_collaborative', 
      settings 
    } = req.body;

    if (!invoice) {
      return res.status(400).json({ error: 'Invoice data is required' });
    }

    const ai = getGenAIClient();

    if (!ai) {
      return res.json(getFallbackDraft(invoice, stage, customContext, strategy, settings));
    }

    const prompt = `You are an expert financial communications AI assistant for freelancers and boutique agencies.
Draft a high-converting, professional invoice follow-up email and a short SMS/WhatsApp blurb.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Client Name: ${invoice.clientName}
- Company: ${invoice.clientCompany || 'N/A'}
- Amount: $${invoice.amount} ${invoice.currency}
- Due Date: ${invoice.dueDate}
- Status: ${invoice.status}
- Service Description: ${invoice.serviceDescription}
- Payment Link: ${invoice.paymentLink}
- Sender Name: ${settings?.userName || 'Freelancer / Service Provider'}
- Sender Business: ${settings?.businessName || 'Agency Studio'}

Escalation Stage: ${stage}
Strategy: ${strategy}
Special User Instructions / Context: "${customContext || 'None'}"

Return ONLY a valid JSON object with this exact schema:
{
  "subject": "Clear, engaging email subject line (under 60 chars)",
  "body": "The full email body formatted with friendly greetings, clear ask, payment link, polite sign-off",
  "smsSnippet": "Ultra-concise text message / WhatsApp blurb under 150 chars including the payment link",
  "aiTip": "A 1-sentence psychological or cash-collection strategy tip for this specific scenario",
  "suggestedNextAction": "A brief actionable recommendation on timing or escalation"
}`;

    const parsed = await callGeminiJson(ai, prompt);
    if (parsed) {
      return res.json(parsed);
    }

    // Graceful fallback if Gemini encountered high demand
    return res.json(getFallbackDraft(invoice, stage, customContext, strategy, settings));
  } catch (error: any) {
    console.error('Error in /api/ai/draft-chaser:', error);
    // Even on uncaught error, fallback safely rather than breaking the UI
    const { invoice, stage, customContext, strategy = 'polite_collaborative', settings } = req.body || {};
    if (invoice) {
      return res.json(getFallbackDraft(invoice, stage, customContext, strategy, settings));
    }
    return res.status(500).json({ error: error.message || 'Failed to draft AI reminder' });
  }
});

// 2. AI Parse Invoice from Raw Text Route
app.post('/api/ai/parse-invoice', async (req, res) => {
  try {
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const ai = getGenAIClient();

    if (!ai) {
      return res.json(getFallbackParse(rawText));
    }

    const prompt = `Extract invoice details from this unstructured text (email, contract snippet, or message):
"""
${rawText}
"""

Return ONLY a valid JSON object matching this schema:
{
  "clientName": "Full name of the contact person if found, or sensible default",
  "clientEmail": "Email address if found, or empty string",
  "clientCompany": "Company name if found, or empty string",
  "amount": number (just the numeric value, e.g. 2500),
  "currency": "USD" or currency found,
  "dueDate": "YYYY-MM-DD" (calculate based on mentions like 'net 30', 'in 2 weeks', or specific dates. Default to 14 days from today if not specified),
  "serviceDescription": "Clear 4-8 word summary of the work/deliverables",
  "notes": "Any other key details or terms detected"
}`;

    const parsed = await callGeminiJson(ai, prompt);
    if (parsed) {
      return res.json({ extracted: parsed });
    }

    return res.json(getFallbackParse(rawText));
  } catch (error: any) {
    console.error('Error in /api/ai/parse-invoice:', error);
    return res.json(getFallbackParse(req.body?.rawText || ''));
  }
});

// 3. AI Objection & Excuse Counter Assistant Route
app.post('/api/ai/counter-excuse', async (req, res) => {
  try {
    const { clientExcuse, invoice, senderName = 'The Freelancer' } = req.body;

    if (!clientExcuse) {
      return res.status(400).json({ error: 'Client excuse is required' });
    }

    const ai = getGenAIClient();

    if (!ai) {
      return res.json(getFallbackCounter(clientExcuse, invoice, senderName));
    }

    const prompt = `You are an expert client negotiator and cash recovery specialist for independent professionals.
A client has provided this excuse / delay reason for not paying invoice #${invoice?.invoiceNumber || 'INV-01'} ($${invoice?.amount || 1500}):

Client's excuse:
"""${clientExcuse}"""

Invoice Context:
- Client: ${invoice?.clientName || 'Client'} (${invoice?.clientCompany || 'Company'})
- Amount: $${invoice?.amount} ${invoice?.currency || 'USD'}
- Due Date: ${invoice?.dueDate}
- Status: ${invoice?.status}
- Payment Link: ${invoice?.paymentLink}
- Sender: ${senderName}

Generate 3 distinct strategic counter-response scripts the freelancer can send.
Return ONLY valid JSON matching this schema:
{
  "options": [
    {
      "title": "Strategy Name (e.g. Diplomatic Firm Boundary)",
      "tag": "Short tag (e.g. Firm & Professional, Win-Win Compromise, Executive Escalation)",
      "script": "The exact, courteous, ready-to-copy email/message text",
      "rationale": "1 sentence explaining why this works psychologically"
    },
    {
      "title": "Strategy Name",
      "tag": "Short tag",
      "script": "Ready-to-copy message text",
      "rationale": "Why this works"
    },
    {
      "title": "Strategy Name",
      "tag": "Short tag",
      "script": "Ready-to-copy message text",
      "rationale": "Why this works"
    }
  ]
}`;

    const parsed = await callGeminiJson(ai, prompt);
    if (parsed && (parsed as any).options) {
      return res.json(parsed);
    }

    return res.json(getFallbackCounter(clientExcuse, invoice, senderName));
  } catch (error: any) {
    console.error('Error in /api/ai/counter-excuse:', error);
    return res.json(getFallbackCounter(req.body?.clientExcuse || '', req.body?.invoice, req.body?.senderName || 'The Freelancer'));
  }
});

// 4. AI Cashflow Risk & Intelligence Radar Route
app.post('/api/ai/analyze-risk', async (req, res) => {
  try {
    const { invoices } = req.body;

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({ error: 'Invoices array required' });
    }

    const pendingInvoices = invoices.filter(i => i.status !== 'paid');
    const ai = getGenAIClient();

    if (!ai) {
      return res.json(getFallbackRiskAnalysis(pendingInvoices));
    }

    const prompt = `You are a Chief Financial Officer AI reviewing outstanding freelance/agency receivables.
Analyze these unpaid invoices:
${JSON.stringify(pendingInvoices.map(i => ({
  id: i.id,
  number: i.invoiceNumber,
  client: i.clientName,
  company: i.clientCompany,
  amount: i.amount,
  due: i.dueDate,
  status: i.status,
  remindersSent: i.remindersSentCount,
  remindersPaused: i.remindersPaused
})))}

Provide a sharp, actionable cash recovery forecast and risk assessment.
Return ONLY valid JSON matching this schema:
{
  "overallHealthScore": number from 0 to 100 (100 is pristine, <50 is critical risk),
  "executiveSummary": "2 concise sentences on portfolio liquidity and immediate recovery priorities",
  "totalAtRisk": number,
  "analyzedInvoices": [
    {
      "invoiceId": "string id",
      "invoiceNumber": "string",
      "clientName": "string",
      "amount": number,
      "riskScore": number from 0 to 100,
      "riskLevel": "low" | "medium" | "high",
      "recommendation": "Specific 1-sentence tactical action for this exact client"
    }
  ]
}`;

    const parsed = await callGeminiJson(ai, prompt);
    if (parsed && (parsed as any).analyzedInvoices) {
      return res.json(parsed);
    }

    // Graceful fallback if Gemini encountered high demand
    return res.json(getFallbackRiskAnalysis(pendingInvoices));
  } catch (error: any) {
    console.warn('Handling risk analysis error with resilient fallback:', error?.message);
    const pendingInvoices = Array.isArray(req.body?.invoices) ? req.body.invoices.filter((i: any) => i.status !== 'paid') : [];
    return res.json(getFallbackRiskAnalysis(pendingInvoices));
  }
});

// Endpoint to diagnose automated email deliverability, validate email syntax, and flag errors
app.post('/api/chaser/diagnose-emails', (req, res) => {
  const { invoices } = req.body || {};
  const list = Array.isArray(invoices) ? invoices : [];
  const issues: any[] = [];
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  let validCount = 0;
  let invalidCount = 0;

  list.forEach((inv: any) => {
    const email = (inv?.clientEmail || '').trim();
    if (!email) {
      invalidCount++;
      issues.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        type: 'error',
        message: 'Recipient email address is completely missing'
      });
    } else if (!emailRegex.test(email)) {
      invalidCount++;
      issues.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        type: 'error',
        message: `Recipient email format "${email}" is invalid`
      });
    } else {
      validCount++;
    }

    if (!inv?.paymentLink) {
      issues.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        type: 'warning',
        message: 'Missing direct checkout/payment link'
      });
    }
  });

  const total = list.length || 1;
  const healthScore = Math.max(0, Math.round(((total - invalidCount) / total) * 100));

  res.json({
    status: 'ok',
    healthScore,
    validCount,
    invalidCount,
    issuesCount: issues.length,
    issues
  });
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChaserFlow AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
