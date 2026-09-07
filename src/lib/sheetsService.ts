import { Invoice } from '../types/chaserflow';

export interface GoogleSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

const INVOICE_SHEET_HEADERS = [
  'Invoice #',
  'Client Name',
  'Company',
  'Client Email',
  'Amount',
  'Currency',
  'Due Date',
  'Status',
  'Reminders Sent',
  'Payment Link',
  'Service Description'
];

/**
 * List recent spreadsheets from user's Google Drive
 */
export async function listGoogleSpreadsheets(accessToken: string): Promise<GoogleSpreadsheetItem[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=15&fields=files(id,name,modifiedTime,webViewLink)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to list spreadsheets (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create a new styled Google Spreadsheet and insert current invoices
 */
export async function createGoogleSpreadsheetWithInvoices(
  accessToken: string,
  invoices: Invoice[],
  title?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const now = new Date().toISOString().split('T')[0];
  const sheetTitle = title || `ChaserFlow Invoices - ${now}`;

  // Build row data
  const rowData = [
    {
      values: INVOICE_SHEET_HEADERS.map((h) => ({
        userEnteredValue: { stringValue: h },
        userEnteredFormat: {
          backgroundColor: { red: 0.08, green: 0.12, blue: 0.2 },
          textFormat: { bold: true, foregroundColor: { red: 0.9, green: 0.95, blue: 1.0 } },
        },
      })),
    },
    ...invoices.map((inv) => ({
      values: [
        { userEnteredValue: { stringValue: inv.invoiceNumber } },
        { userEnteredValue: { stringValue: inv.clientName } },
        { userEnteredValue: { stringValue: inv.clientCompany || '' } },
        { userEnteredValue: { stringValue: inv.clientEmail || '' } },
        { userEnteredValue: { numberValue: inv.amount } },
        { userEnteredValue: { stringValue: inv.currency || 'USD' } },
        { userEnteredValue: { stringValue: inv.dueDate } },
        { userEnteredValue: { stringValue: inv.status } },
        { userEnteredValue: { numberValue: inv.remindersSentCount || 0 } },
        { userEnteredValue: { stringValue: inv.paymentLink } },
        { userEnteredValue: { stringValue: inv.serviceDescription || '' } },
      ],
    })),
  ];

  const payload = {
    properties: {
      title: sheetTitle,
    },
    sheets: [
      {
        properties: {
          title: 'Invoices',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData,
          },
        ],
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Sheet (${res.status})`);
  }

  const result = await res.json();
  return {
    spreadsheetId: result.spreadsheetId,
    spreadsheetUrl: result.spreadsheetUrl,
  };
}

/**
 * Update an existing spreadsheet's Invoices tab with current invoices
 */
export async function syncInvoicesToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  invoices: Invoice[]
): Promise<void> {
  // First get sheet info to know target tab name
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Could not access spreadsheet');
  }

  const meta = await metaRes.json();
  const firstSheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';

  const rows = [
    INVOICE_SHEET_HEADERS,
    ...invoices.map((inv) => [
      inv.invoiceNumber,
      inv.clientName,
      inv.clientCompany || '',
      inv.clientEmail || '',
      inv.amount,
      inv.currency || 'USD',
      inv.dueDate,
      inv.status,
      inv.remindersSentCount || 0,
      inv.paymentLink,
      inv.serviceDescription || '',
    ]),
  ];

  const range = `${firstSheetName}!A1:K${rows.length}`;

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to update spreadsheet data');
  }
}

/**
 * Import invoices from an existing Google Sheet
 */
export async function importInvoicesFromSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Invoice[]> {
  // Discover actual sheet tab name
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to load spreadsheet details');
  }

  const meta = await metaRes.json();
  const firstSheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';

  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(firstSheetName)}!A1:Z500`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!valuesRes.ok) {
    const err = await valuesRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to read spreadsheet rows');
  }

  const data = await valuesRes.json();
  const rawRows: any[][] = data.values || [];

  if (rawRows.length < 2) {
    throw new Error('The selected spreadsheet does not contain any data rows.');
  }

  const headerRow = rawRows[0].map((h) => String(h || '').toLowerCase().trim());

  // Find column indices
  const findCol = (keywords: string[]) =>
    headerRow.findIndex((col) => keywords.some((k) => col.includes(k)));

  const numIdx = findCol(['invoice #', 'invoice', 'inv', 'number']);
  const clientIdx = findCol(['client name', 'client', 'customer', 'name']);
  const compIdx = findCol(['company', 'organization', 'business']);
  const emailIdx = findCol(['email', 'mail']);
  const amountIdx = findCol(['amount', 'total', 'price', 'fee']);
  const currIdx = findCol(['currency', 'cur']);
  const dueIdx = findCol(['due date', 'due', 'deadline']);
  const statusIdx = findCol(['status', 'state']);
  const linkIdx = findCol(['link', 'payment', 'url']);
  const descIdx = findCol(['description', 'service', 'details', 'work']);

  const parsedInvoices: Invoice[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawNum = numIdx >= 0 && row[numIdx] ? String(row[numIdx]).trim() : `INV-${1000 + i}`;
    const rawClient = clientIdx >= 0 && row[clientIdx] ? String(row[clientIdx]).trim() : '';
    if (!rawClient && !rawNum) continue;

    const rawAmount = amountIdx >= 0 && row[amountIdx] ? parseFloat(String(row[amountIdx]).replace(/[^0-9.]/g, '')) : 0;
    const rawDue = dueIdx >= 0 && row[dueIdx] ? String(row[dueIdx]).trim() : new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    
    let rawStatus: Invoice['status'] = 'pending';
    const statusVal = statusIdx >= 0 && row[statusIdx] ? String(row[statusIdx]).toLowerCase().trim() : '';
    if (statusVal.includes('paid')) rawStatus = 'paid';
    else if (statusVal.includes('overdue')) rawStatus = 'overdue';
    else if (statusVal.includes('soon')) rawStatus = 'due_soon';
    else rawStatus = 'pending';

    const invoice: Invoice = {
      id: `inv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber: rawNum || `INV-${1000 + i}`,
      clientName: rawClient || 'Client Name',
      clientCompany: compIdx >= 0 && row[compIdx] ? String(row[compIdx]).trim() : '',
      clientEmail: emailIdx >= 0 && row[emailIdx] ? String(row[emailIdx]).trim() : '',
      amount: isNaN(rawAmount) ? 1000 : rawAmount,
      currency: currIdx >= 0 && row[currIdx] ? String(row[currIdx]).trim().toUpperCase() : 'USD',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: rawDue,
      serviceDescription: descIdx >= 0 && row[descIdx] ? String(row[descIdx]).trim() : 'Professional Deliverables',
      status: rawStatus,
      paymentLink: linkIdx >= 0 && row[linkIdx] ? String(row[linkIdx]).trim() : `https://checkout.stripe.com/pay/${rawNum.toLowerCase()}`,
      remindersSentCount: 0,
      remindersPaused: false,
      reminderHistory: []
    };

    parsedInvoices.push(invoice);
  }

  return parsedInvoices;
}
