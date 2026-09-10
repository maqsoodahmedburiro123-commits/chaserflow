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

/**
 * Accounting software format presets supported for CSV export
 */
export type AccountingSoftwareFormat = 'universal' | 'quickbooks' | 'xero' | 'freshbooks';

export interface AccountingExportOptions {
  format: AccountingSoftwareFormat;
  statusFilter?: 'all' | 'unpaid' | 'overdue' | 'paid';
  customTitle?: string;
}

export const ACCOUNTING_FORMAT_DETAILS: Record<AccountingSoftwareFormat, {
  name: string;
  tagline: string;
  software: string;
  extensionHelp: string;
}> = {
  universal: {
    name: 'Universal Standard / General Ledger',
    tagline: 'Standard multi-column CSV with all invoice attributes, notes, and payment links.',
    software: 'Google Sheets, Microsoft Excel, Zoho Books, Apple Numbers',
    extensionHelp: 'Includes complete metadata (Invoice #, Client, Company, Amount, Dates, Status, Links, Notes).'
  },
  quickbooks: {
    name: 'QuickBooks Online (QBO)',
    tagline: 'Preset to match Intuit QuickBooks standard invoice batch import columns.',
    software: 'Intuit QuickBooks Online & Desktop',
    extensionHelp: 'Maps to *Customer, *InvoiceNo, *InvoiceDate, *DueDate, *ItemDescription, *ItemAmount, Currency.'
  },
  xero: {
    name: 'Xero Accounting',
    tagline: 'Preset matching official Xero CSV invoice upload template requirements.',
    software: 'Xero Cloud Accounting',
    extensionHelp: 'Maps to *ContactName, EmailAddress, *InvoiceNumber, *InvoiceDate, *DueDate, *Description, *UnitAmount.'
  },
  freshbooks: {
    name: 'FreshBooks & Wave',
    tagline: 'Formatted for direct itemized import into FreshBooks, Wave, and FreeAgent.',
    software: 'FreshBooks, Wave Invoicing, FreeAgent',
    extensionHelp: 'Maps to Customer Name, Email, Invoice #, Invoice Date, Due Date, Description, Line Total, Currency.'
  }
};

/**
 * Filter invoices based on accounting status filter
 */
export function filterInvoicesForExport(invoices: Invoice[], filter: 'all' | 'unpaid' | 'overdue' | 'paid' = 'all'): Invoice[] {
  switch (filter) {
    case 'unpaid':
      return invoices.filter(i => i.status !== 'paid');
    case 'overdue':
      return invoices.filter(i => i.status === 'overdue');
    case 'paid':
      return invoices.filter(i => i.status === 'paid');
    case 'all':
    default:
      return invoices;
  }
}

/**
 * Generate CSV text string based on selected accounting software specification
 */
export function generateAccountingCSV(invoices: Invoice[], options: AccountingExportOptions): {
  csvContent: string;
  headers: string[];
  sampleRows: string[][];
  rowsCount: number;
  fileName: string;
} {
  const filtered = filterInvoicesForExport(invoices, options.statusFilter || 'all');

  const escapeCSV = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  let headers: string[] = [];
  let rows: string[][] = [];

  switch (options.format) {
    case 'quickbooks':
      headers = [
        '*Customer',
        '*InvoiceNo',
        '*InvoiceDate',
        '*DueDate',
        'Terms',
        '*Item(Product/Service)',
        '*ItemDescription',
        '*ItemAmount',
        '*ItemTaxCode',
        'Currency',
        'Memo'
      ];
      rows = filtered.map(inv => [
        escapeCSV(inv.clientCompany || inv.clientName),
        escapeCSV(inv.invoiceNumber),
        escapeCSV(inv.issueDate),
        escapeCSV(inv.dueDate),
        escapeCSV('Net 30'),
        escapeCSV('Services'),
        escapeCSV(inv.serviceDescription || 'Professional Services'),
        String(inv.amount),
        escapeCSV('NON'),
        escapeCSV(inv.currency || 'USD'),
        escapeCSV(inv.paymentLink ? `Payment URL: ${inv.paymentLink}` : '')
      ]);
      break;

    case 'xero':
      headers = [
        '*ContactName',
        'EmailAddress',
        'POAddressLine1',
        '*InvoiceNumber',
        'Reference',
        '*InvoiceDate',
        '*DueDate',
        '*Description',
        '*Quantity',
        '*UnitAmount',
        '*AccountCode',
        '*TaxType',
        'Currency'
      ];
      rows = filtered.map(inv => [
        escapeCSV(inv.clientName),
        escapeCSV(inv.clientEmail),
        escapeCSV(inv.clientCompany || ''),
        escapeCSV(inv.invoiceNumber),
        escapeCSV(inv.serviceDescription?.slice(0, 30) || 'Receivable'),
        escapeCSV(inv.issueDate),
        escapeCSV(inv.dueDate),
        escapeCSV(inv.serviceDescription || 'Services Rendered'),
        '1',
        String(inv.amount),
        escapeCSV('200'),
        escapeCSV('Tax Exempt (0%)'),
        escapeCSV(inv.currency || 'USD')
      ]);
      break;

    case 'freshbooks':
      headers = [
        'Customer Name',
        'Customer Email',
        'Organization',
        'Invoice Number',
        'Invoice Date',
        'Due Date',
        'Item Name',
        'Item Description',
        'Quantity',
        'Unit Cost',
        'Line Total',
        'Currency',
        'Status',
        'Notes / Payment Link'
      ];
      rows = filtered.map(inv => [
        escapeCSV(inv.clientName),
        escapeCSV(inv.clientEmail),
        escapeCSV(inv.clientCompany || ''),
        escapeCSV(inv.invoiceNumber),
        escapeCSV(inv.issueDate),
        escapeCSV(inv.dueDate),
        escapeCSV('Professional Services'),
        escapeCSV(inv.serviceDescription),
        '1',
        String(inv.amount),
        String(inv.amount),
        escapeCSV(inv.currency || 'USD'),
        escapeCSV(inv.status.toUpperCase()),
        escapeCSV(inv.paymentLink || '')
      ]);
      break;

    case 'universal':
    default:
      headers = [
        'Invoice Number',
        'Client Name',
        'Company',
        'Client Email',
        'Amount',
        'Currency',
        'Issue Date',
        'Due Date',
        'Status',
        'Paid Date',
        'Reminders Sent',
        'Payment Link',
        'Service Description',
        'Internal Notes'
      ];
      rows = filtered.map(inv => [
        escapeCSV(inv.invoiceNumber),
        escapeCSV(inv.clientName),
        escapeCSV(inv.clientCompany || ''),
        escapeCSV(inv.clientEmail),
        String(inv.amount),
        escapeCSV(inv.currency || 'USD'),
        escapeCSV(inv.issueDate),
        escapeCSV(inv.dueDate),
        escapeCSV(inv.status),
        escapeCSV(inv.paidDate || ''),
        String(inv.remindersSentCount || 0),
        escapeCSV(inv.paymentLink),
        escapeCSV(inv.serviceDescription),
        escapeCSV(inv.notes || '')
      ]);
      break;
  }

  const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');

  const todayStr = new Date().toISOString().split('T')[0];
  const prefix = options.customTitle 
    ? options.customTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    : `chaserflow_${options.format}_invoices_${todayStr}`;
  const fileName = `${prefix}.csv`;

  return {
    csvContent,
    headers,
    sampleRows: rows.slice(0, 3),
    rowsCount: rows.length,
    fileName
  };
}

/**
 * Direct 1-Click CSV Export for Google Sheets and Accounting Software
 */
export function exportInvoicesToCSV(
  invoices: Invoice[], 
  customTitle?: string,
  options?: Partial<AccountingExportOptions>
): void {
  const exportOpts: AccountingExportOptions = {
    format: options?.format || 'universal',
    statusFilter: options?.statusFilter || 'all',
    customTitle
  };

  const { csvContent, fileName } = generateAccountingCSV(invoices, exportOpts);
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV or TSV text (e.g. copied from Google Sheets / Excel table) into Invoices
 */
export function parseInvoicesFromCSV(csvText: string): Invoice[] {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('Please provide at least a header line and one data row.');
  }

  // Detect delimiter: tab or comma
  const firstLine = lines[0];
  const isTab = firstLine.includes('\t');
  const delimiter = isTab ? '\t' : ',';

  // Helper to split row respecting quotes
  const splitRow = (line: string): string[] => {
    if (isTab) return line.split('\t').map(s => s.trim().replace(/^"|"$/g, ''));
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const headerRow = splitRow(lines[0]).map(h => h.toLowerCase().trim());
  const findCol = (keywords: string[]) =>
    headerRow.findIndex(col => keywords.some(k => col.includes(k)));

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

  for (let i = 1; i < lines.length; i++) {
    const row = splitRow(lines[i]);
    if (!row || row.length === 0 || row.every(cell => !cell)) continue;

    const rawNum = numIdx >= 0 && row[numIdx] ? row[numIdx] : `INV-IMP-${1000 + i}`;
    const rawClient = clientIdx >= 0 && row[clientIdx] ? row[clientIdx] : `Client ${i}`;
    const rawAmount = amountIdx >= 0 && row[amountIdx] ? parseFloat(row[amountIdx].replace(/[^0-9.]/g, '')) : 1250;
    const rawDue = dueIdx >= 0 && row[dueIdx] ? row[dueIdx] : new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    let rawStatus: Invoice['status'] = 'pending';
    const statusVal = statusIdx >= 0 && row[statusIdx] ? row[statusIdx].toLowerCase() : '';
    if (statusVal.includes('paid')) rawStatus = 'paid';
    else if (statusVal.includes('overdue')) rawStatus = 'overdue';
    else if (statusVal.includes('soon')) rawStatus = 'due_soon';

    parsedInvoices.push({
      id: `csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber: rawNum,
      clientName: rawClient,
      clientCompany: compIdx >= 0 && row[compIdx] ? row[compIdx] : '',
      clientEmail: emailIdx >= 0 && row[emailIdx] ? row[emailIdx] : '',
      amount: isNaN(rawAmount) ? 1000 : rawAmount,
      currency: currIdx >= 0 && row[currIdx] ? row[currIdx].toUpperCase() : 'USD',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: rawDue,
      serviceDescription: descIdx >= 0 && row[descIdx] ? row[descIdx] : 'Consulting / Design Services',
      status: rawStatus,
      paymentLink: linkIdx >= 0 && row[linkIdx] ? row[linkIdx] : `https://pay.stripe.com/${rawNum.toLowerCase()}`,
      remindersSentCount: 0,
      remindersPaused: false,
      reminderHistory: []
    });
  }

  return parsedInvoices;
}

