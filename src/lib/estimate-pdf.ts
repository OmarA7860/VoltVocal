import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { EstimateResult } from "@/types/estimate";
import {
  sanitizeCompanyNameForPdf,
  sanitizeEstimateForPdfExport,
} from "@/lib/sanitize-ai-text";

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type DownloadOptions = {
  companyName?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  clientName?: string;
  clientAddress?: string;
};

function resolveCompanyName(options?: DownloadOptions): string {
  if (options?.companyName?.trim()) {
    return sanitizeCompanyNameForPdf(options.companyName);
  }
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_COMPANY_NAME?.trim()
  ) {
    return sanitizeCompanyNameForPdf(process.env.NEXT_PUBLIC_COMPANY_NAME);
  }
  return "Contractor Estimate";
}

// Brand colours
const BRAND_DARK: [number, number, number] = [15, 36, 25];   // near-black green
const BRAND_MID: [number, number, number]  = [37, 99, 66];   // forest green
const BRAND_ACCENT: [number, number, number] = [58, 143, 95]; // action green
const GREY_TEXT: [number, number, number]  = [80, 90, 85];
const LIGHT_GREY: [number, number, number] = [230, 235, 232];
const WHITE: [number, number, number]      = [255, 255, 255];
const TOTAL_GREEN: [number, number, number] = [37, 99, 66];

export function downloadEstimatePdf(
  estimate: EstimateResult,
  options?: DownloadOptions,
): void {
  const safeEstimate = sanitizeEstimateForPdfExport(estimate);
  const company = resolveCompanyName(options);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth  = doc.internal.pageSize.getWidth();   // 215.9 mm
  const pageHeight = doc.internal.pageSize.getHeight();  // 279.4 mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // ─── HEADER BAND ────────────────────────────────────────────────────────────
  const bandH = 28;
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, pageWidth, bandH, "F");

  // Thin accent strip at very top
  doc.setFillColor(...BRAND_ACCENT);
  doc.rect(0, 0, pageWidth, 2, "F");

  // Company name — white, left
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(company, margin, 17);

  // "ESTIMATE" — right aligned, large
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND_ACCENT);
  doc.text("ESTIMATE", pageWidth - margin, 17, { align: "right" });

  // ─── CONTACT STRIP ──────────────────────────────────────────────────────────
  const stripH = 10;
  doc.setFillColor(...BRAND_MID);
  doc.rect(0, bandH, pageWidth, stripH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);

  const contactParts: string[] = [];
  if (options?.licenseNumber) contactParts.push(`Lic: ${options.licenseNumber}`);
  if (options?.phone)         contactParts.push(options.phone);
  if (options?.email)         contactParts.push(options.email);

  if (contactParts.length > 0) {
    doc.text(contactParts.join("   ·   "), margin, bandH + 6.5);
  }

  // Date — right side of strip
  const dateStr = new Date().toLocaleDateString("en-CA", { dateStyle: "long" });
  doc.text(`Date: ${dateStr}`, pageWidth - margin, bandH + 6.5, { align: "right" });

  // ─── PREPARED FOR ───────────────────────────────────────────────────────────
  let preparedForH = 0;
  if (options?.clientName?.trim()) {
    preparedForH = 14;
    doc.setFillColor(245, 248, 246);
    doc.rect(0, bandH + stripH, pageWidth, preparedForH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY_TEXT);
    doc.text("PREPARED FOR", margin, bandH + stripH + 5.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 40, 35);
    doc.text(options.clientName.trim(), margin, bandH + stripH + 11);
    if (options?.clientAddress?.trim()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GREY_TEXT);
      doc.text(options.clientAddress.trim(), margin + doc.getTextWidth(options.clientName.trim()) + 4, bandH + stripH + 11);
    }
  }

  // ─── TABLE ──────────────────────────────────────────────────────────────────
  let tableStartY = bandH + stripH + preparedForH + 8;

  const body =
    safeEstimate.lineItems.length > 0
      ? safeEstimate.lineItems.map((row) => [
          row.description,
          String(row.quantity),
          row.unit,
          money.format(row.unitPrice),
          money.format(row.lineTotal),
          row.proRecommendation.trim() || "—",
        ])
      : [["No line items in this estimate", "—", "—", "—", "—", "—"]];

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [["Description", "Qty", "Unit", "Unit Price", "Line Total", "Notes / Recommendations"]],
    body,
    theme: "plain",
    headStyles: {
      fillColor: BRAND_DARK,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 40, 35],
      cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 },
      valign: "top",
    },
    alternateRowStyles: {
      fillColor: [245, 248, 246],
    },
    styles: {
      lineColor: LIGHT_GREY,
      lineWidth: 0.15,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold" },
      1: { halign: "right", cellWidth: 12 },
      2: { cellWidth: 14, textColor: GREY_TEXT },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", cellWidth: 26, fontStyle: "bold" },
      5: {
        cellWidth: "auto",
        fontSize: 7,
        textColor: GREY_TEXT,
      },
    },
    didDrawPage: (data) => {
      // Re-draw header on continuation pages
      if (data.pageNumber > 1) {
        doc.setFillColor(...BRAND_DARK);
        doc.rect(0, 0, pageWidth, bandH, "F");
        doc.setFillColor(...BRAND_ACCENT);
        doc.rect(0, 0, pageWidth, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(...WHITE);
        doc.text(company, margin, 17);
        doc.setFontSize(10);
        doc.setTextColor(...BRAND_ACCENT);
        doc.text("ESTIMATE — cont.", pageWidth - margin, 17, { align: "right" });
      }

      // Page number footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: "right" },
      );
    },
  });

  const docExt = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  let finalY = docExt.lastAutoTable?.finalY ?? tableStartY + 40;

  // ─── TOTALS BLOCK ───────────────────────────────────────────────────────────
  const subtotal   = safeEstimate.total;
  const hst        = Math.round(subtotal * 0.13 * 100) / 100;
  const grandTotal = Math.round((subtotal + hst) * 100) / 100;

  const totalBlockH = 36;
  if (finalY + totalBlockH > pageHeight - 30) {
    doc.addPage();
    finalY = bandH + stripH + 10;
  }

  finalY += 6;

  // Totals box — right-aligned panel
  const boxW  = 80;
  const boxX  = pageWidth - margin - boxW;
  const boxY  = finalY;
  const rowH  = 7.5;

  // Subtotal row
  doc.setFillColor(248, 250, 249);
  doc.setDrawColor(...LIGHT_GREY);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, boxY, boxW, rowH * 2 + 0.5 + rowH + 2, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY_TEXT);
  doc.text("Subtotal", boxX + 6, boxY + rowH - 1.5);
  doc.text(money.format(subtotal), boxX + boxW - 6, boxY + rowH - 1.5, { align: "right" });

  // HST row
  doc.setTextColor(160, 170, 165);
  doc.setFontSize(8);
  doc.text("HST (13%)", boxX + 6, boxY + rowH * 2 - 1);
  doc.text(money.format(hst), boxX + boxW - 6, boxY + rowH * 2 - 1, { align: "right" });

  // Divider
  const divY = boxY + rowH * 2 + 0.5;
  doc.setDrawColor(...LIGHT_GREY);
  doc.line(boxX + 4, divY, boxX + boxW - 4, divY);

  // Grand total row — purple bold
  doc.setFillColor(...TOTAL_GREEN);
  doc.roundedRect(boxX, divY + 1, boxW, rowH + 3, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text("Total (incl. HST)", boxX + 6, divY + rowH + 1);
  doc.text(money.format(grandTotal), boxX + boxW - 6, divY + rowH + 1, { align: "right" });

  // CAD disclaimer beneath box
  const disclaimerY = divY + rowH + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(180, 180, 180);
  doc.text("All amounts in Canadian dollars (CAD).", boxX + boxW - 6, disclaimerY, { align: "right" });

  // ─── NOTES ──────────────────────────────────────────────────────────────────
  if (safeEstimate.notes.trim()) {
    const notesY = finalY + 2;
    if (notesY > pageHeight - 40) {
      doc.addPage();
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_MID);
    doc.text("Notes", margin, notesY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY_TEXT);
    const noteLines = doc.splitTextToSize(safeEstimate.notes.trim(), boxX - margin - 6);
    doc.text(noteLines, margin, notesY + 11);
  }

  // ─── FOOTER ─────────────────────────────────────────────────────────────────
  const footerY = pageHeight - 14;
  doc.setDrawColor(...LIGHT_GREY);
  doc.setLineWidth(0.25);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 170, 165);
  doc.text(
    "This estimate is valid for 30 days from the date of issue. Prices subject to change without notice.",
    margin,
    footerY + 4,
  );
  doc.text(
    `Generated by ${company}`,
    pageWidth - margin,
    footerY + 4,
    { align: "right" },
  );

  // ─── SAVE ───────────────────────────────────────────────────────────────────
  const safeDate = new Date().toISOString().slice(0, 10);
  doc.save(`estimate-${safeDate}.pdf`);
}
