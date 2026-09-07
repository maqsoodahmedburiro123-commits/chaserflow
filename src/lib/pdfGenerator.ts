import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, ChaserSettings } from '../types/chaserflow';

/**
 * Generate a clean, branded PDF Invoice
 */
export function generateInvoicePdf(invoice: Invoice, settings: ChaserSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currencySymbol = invoice.currency === 'USD' ? '$' : invoice.currency;
  const formattedAmount = `${currencySymbol}${invoice.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  // Top Accent Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 10, 'F');
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 10, 210, 2, 'F');

  // Business Header (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.businessName || 'Morgan Studio & Design', 14, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`From: ${settings.userName}`, 14, 32);
  doc.text(`Email: ${settings.userEmail}`, 14, 37);

  // Invoice Title & Metadata (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('INVOICE', 196, 26, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 196, 32, { align: 'right' });
  doc.text(`Issue Date: ${invoice.issueDate}`, 196, 37, { align: 'right' });
  doc.text(`Due Date: ${invoice.dueDate}`, 196, 42, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 48, 196, 48);

  // Bill To Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO:', 14, 56);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.clientName, 14, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let yPos = 67;
  if (invoice.clientCompany) {
    doc.text(invoice.clientCompany, 14, yPos);
    yPos += 5;
  }
  doc.text(invoice.clientEmail, 14, yPos);

  // Status Badge
  const statusX = 196;
  const statusY = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  if (invoice.status === 'paid') {
    doc.setTextColor(16, 185, 129);
    doc.text('STATUS: PAID IN FULL', statusX, statusY, { align: 'right' });
  } else if (invoice.status === 'overdue') {
    doc.setTextColor(239, 68, 68);
    doc.text('STATUS: PAST DUE', statusX, statusY, { align: 'right' });
  } else {
    doc.setTextColor(14, 165, 233);
    doc.text('STATUS: PAYMENT DUE', statusX, statusY, { align: 'right' });
  }

  // Line Items Table using jspdf-autotable
  autoTable(doc, {
    startY: yPos + 8,
    head: [['SERVICE / DELIVERABLE DESCRIPTION', 'DUE DATE', 'TOTAL AMOUNT']],
    body: [
      [
        invoice.serviceDescription || 'Professional Services',
        invoice.dueDate,
        formattedAmount,
      ],
    ],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85],
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 37, halign: 'right', fontStyle: 'bold' },
    },
    theme: 'grid',
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 120;

  // Summary Totals Table Box (Right aligned)
  const summaryX = 130;
  const summaryY = finalY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', summaryX, summaryY);
  doc.text(formattedAmount, 196, summaryY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Balance Due:', summaryX, summaryY + 8);
  doc.setTextColor(16, 185, 129);
  doc.text(formattedAmount, 196, summaryY + 8, { align: 'right' });

  // Payment Instructions Box
  const boxY = summaryY + 22;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxY, 182, 34, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('PAYMENT INSTRUCTIONS & DIRECT LINK', 18, boxY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const instructionLines = doc.splitTextToSize(
    settings.paymentInstructions || 'Settle securely online via credit card or Apple Pay.',
    174
  );
  doc.text(instructionLines, 18, boxY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`1-Click Payment URL: ${invoice.paymentLink}`, 18, boxY + 28);

  // Late fee terms
  if (settings.enableLateFeeNotice) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `* Overdue Policy: Invoices settled 14+ days beyond due date may be subject to a ${settings.lateFeePercentage}% monthly finance fee.`,
      14,
      boxY + 42
    );
  }

  // Footer Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated via ChaserFlow Automated Invoicing System • Thank you for your partnership!`,
    105,
    285,
    { align: 'center' }
  );

  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
}

/**
 * Generate official PDF Settlement Receipt for paid invoices
 */
export function generateReceiptPdf(invoice: Invoice, settings: ChaserSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currencySymbol = invoice.currency === 'USD' ? '$' : invoice.currency;
  const formattedAmount = `${currencySymbol}${invoice.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  // Top Accent Bar (Green for receipt)
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, 210, 12, 'F');

  // Business Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.businessName || 'Morgan Studio & Design', 14, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issued by: ${settings.userName} (${settings.userEmail})`, 14, 32);

  // Receipt Header (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('PAYMENT RECEIPT', 196, 26, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Receipt #: REC-${invoice.invoiceNumber.replace('INV-', '')}`, 196, 32, { align: 'right' });
  doc.text(`Settlement Date: ${invoice.paidDate || new Date().toISOString().split('T')[0]}`, 196, 37, { align: 'right' });
  doc.text(`Original Invoice: ${invoice.invoiceNumber}`, 196, 42, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 48, 196, 48);

  // Bill To Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('PAID BY:', 14, 56);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.clientName, 14, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let yPos = 67;
  if (invoice.clientCompany) {
    doc.text(invoice.clientCompany, 14, yPos);
    yPos += 5;
  }
  doc.text(invoice.clientEmail, 14, yPos);

  // PAID Watermark Stamp
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(1.2);
  doc.roundedRect(148, 54, 48, 18, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text('✓ PAID IN FULL', 172, 63, { align: 'center' });
  doc.setFontSize(8);
  doc.text('OFFICIAL SETTLEMENT', 172, 69, { align: 'center' });

  // Line Item Table
  autoTable(doc, {
    startY: yPos + 8,
    head: [['SETTLED SERVICE ITEM', 'ORIGINAL DUE DATE', 'AMOUNT PAID']],
    body: [
      [
        invoice.serviceDescription || 'Professional Services',
        invoice.dueDate,
        formattedAmount,
      ],
    ],
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85],
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 37, halign: 'right', fontStyle: 'bold' },
    },
    theme: 'grid',
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 120;

  // Total Paid box
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(14, finalY + 8, 182, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('TOTAL SETTLED AMOUNT:', 20, finalY + 18);
  doc.setFontSize(14);
  doc.text(`${formattedAmount} ${invoice.currency}`, 190, finalY + 18, { align: 'right' });

  // Confirmation Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This document serves as an official confirmation that this invoice has been settled in full. All upcoming automated payment reminders for this item have been permanently halted.',
    14,
    finalY + 42,
    { maxWidth: 182 }
  );

  // Footer Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `ChaserFlow Settlement Verification • Transaction verified and logged.`,
    105,
    285,
    { align: 'center' }
  );

  doc.save(`Receipt-${invoice.invoiceNumber}.pdf`);
}
