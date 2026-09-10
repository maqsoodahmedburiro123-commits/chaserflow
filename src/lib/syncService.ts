import { Invoice, ChaserSettings, ReminderLog } from '../types/chaserflow';

export interface ChaserBackupSnapshot {
  version: string;
  exportedAt: string;
  source: 'chaserflow_backup';
  workspaceKey?: string;
  invoices: Invoice[];
  settings: ChaserSettings;
  stats: {
    totalInvoices: number;
    totalAmount: number;
    paidCount: number;
    unpaidCount: number;
  };
}

export interface CloudSyncResponse {
  status: 'ok' | 'error';
  found?: boolean;
  invoices?: Invoice[];
  settings?: ChaserSettings;
  updatedAt?: string;
  message?: string;
}

/**
 * Generates and downloads a clean, human-readable JSON backup of the entire workspace.
 */
export function downloadWorkspaceBackup(
  invoices: Invoice[],
  settings: ChaserSettings,
  workspaceKey?: string
): void {
  const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const paidCount = invoices.filter(inv => inv.status === 'paid').length;
  const unpaidCount = invoices.length - paidCount;

  const snapshot: ChaserBackupSnapshot = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    source: 'chaserflow_backup',
    workspaceKey: workspaceKey || undefined,
    invoices,
    settings,
    stats: {
      totalInvoices: invoices.length,
      totalAmount,
      paidCount,
      unpaidCount
    }
  };

  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const dateTag = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `chaserflow-backup-${dateTag}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses uploaded JSON backup content.
 */
export function parseBackupJson(rawJson: string): {
  valid: boolean;
  snapshot?: ChaserBackupSnapshot;
  error?: string;
} {
  try {
    const data = JSON.parse(rawJson);
    
    // Validate required fields
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid JSON structure' };
    }

    // Support both ChaserBackupSnapshot format and direct array of invoices
    if (Array.isArray(data)) {
      return {
        valid: true,
        snapshot: {
          version: '1.0-raw',
          exportedAt: new Date().toISOString(),
          source: 'chaserflow_backup',
          invoices: data,
          settings: {} as ChaserSettings,
          stats: {
            totalInvoices: data.length,
            totalAmount: data.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0),
            paidCount: data.filter((i: any) => i.status === 'paid').length,
            unpaidCount: data.filter((i: any) => i.status !== 'paid').length
          }
        }
      };
    }

    if (!Array.isArray(data.invoices)) {
      return { valid: false, error: 'Backup does not contain a valid invoices list' };
    }

    return {
      valid: true,
      snapshot: data as ChaserBackupSnapshot
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Failed to read JSON: ${err?.message || 'Invalid syntax'}`
    };
  }
}

/**
 * Merges backup invoices with current workspace invoices by ID / invoiceNumber.
 */
export function mergeInvoices(existing: Invoice[], incoming: Invoice[]): Invoice[] {
  const map = new Map<string, Invoice>();
  
  // Index existing
  existing.forEach(inv => {
    map.set(inv.id, inv);
    if (inv.invoiceNumber) {
      map.set(`num_${inv.invoiceNumber.toLowerCase()}`, inv);
    }
  });

  // Merge or append incoming
  const result: Invoice[] = [...existing];

  incoming.forEach(newInv => {
    const existingById = map.get(newInv.id);
    const existingByNum = newInv.invoiceNumber ? map.get(`num_${newInv.invoiceNumber.toLowerCase()}`) : undefined;
    const match = existingById || existingByNum;

    if (match) {
      // Update the existing invoice with incoming data, merging reminder histories
      const index = result.findIndex(i => i.id === match.id);
      if (index !== -1) {
        const combinedHistory: ReminderLog[] = [...(match.reminderHistory || [])];
        (newInv.reminderHistory || []).forEach(log => {
          if (!combinedHistory.some(existingLog => existingLog.id === log.id || existingLog.timestamp === log.timestamp)) {
            combinedHistory.push(log);
          }
        });

        result[index] = {
          ...match,
          ...newInv,
          reminderHistory: combinedHistory
        };
      }
    } else {
      // New invoice
      result.unshift(newInv);
    }
  });

  return result;
}

/**
 * Cloud API: Pushes invoices and settings to the remote sync endpoint.
 */
export async function pushCloudSync(
  workspaceKey: string,
  invoices: Invoice[],
  settings: ChaserSettings
): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
  try {
    const cleanKey = workspaceKey.trim().toLowerCase();
    if (!cleanKey) {
      return { success: false, error: 'Workspace key cannot be empty' };
    }

    const response = await fetch(`/api/sync/${encodeURIComponent(cleanKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoices,
        settings,
        clientTimestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to push to cloud'
    };
  }
}

/**
 * Cloud API: Pulls invoices and settings from the remote sync endpoint.
 */
export async function pullCloudSync(
  workspaceKey: string
): Promise<CloudSyncResponse> {
  try {
    const cleanKey = workspaceKey.trim().toLowerCase();
    if (!cleanKey) {
      return { status: 'error', message: 'Workspace key cannot be empty' };
    }

    const response = await fetch(`/api/sync/${encodeURIComponent(cleanKey)}`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as CloudSyncResponse;
  } catch (err: any) {
    return {
      status: 'error',
      message: err?.message || 'Failed to pull from cloud'
    };
  }
}

/**
 * Helper to generate a memorable random workspace key, e.g. "CHASER-7X9K"
 */
export function generateRandomWorkspaceKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CHASER-${code}`;
}
