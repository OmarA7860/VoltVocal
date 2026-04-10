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
  return "JobSite Estimate";
}

export function downloadEstimatePdf(
  estimate: EstimateResult,
  options?: DownloadOptions,
): void {
  const safeEstimate = sanitizeEstimateForPdfExport(estimate);
  const company = resolveCompanyName(options);
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(23, 23, 23);
  doc.text(company, margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(82, 82, 91);
  const dateStr = new Date().toLocaleDateString("en-US", { dateStyle: "long" });
  doc.text(`Date: ${dateStr}`, margin, y);
  y += 8;

  // Contractor info block — top right
  {
    const rightX = pageWidth - margin;
    let infoY = margin;
    const hasInfo =
      options?.companyName || options?.licenseNumber || options?.phone || options?.email;
    if (hasInfo) {
      if (options?.companyName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(23, 23, 23);
        doc.text(sanitizeCompanyNameForPdf(options.companyName), rightX, infoY, {
          align: "right",
        });
        infoY += 5.5;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      if (options?.licenseNumber) {
        doc.text(`ECRA/ESA: ${options.licenseNumber}`, rightX, infoY, { align: "right" });
        infoY += 5;
      }
      if (options?.phone) {
        doc.text(options.phone, rightX, infoY, { align: "right" });
        infoY += 5;
      }
      if (options?.email) {
        doc.text(options.email, rightX, infoY, { align: "right" });
      }
    }
  }

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setTextColor(23, 23, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Estimate (Expert Mode)", margin, y);
  y += 6;

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
      : [
          [
            "No line items in this estimate",
            "—",
            "—",
            "—",
            "—",
            "—",
          ],
        ];

  const subtotal = safeEstimate.total;
  const hst = Math.round(subtotal * 0.13 * 100) / 100;
  const grandTotal = Math.round((subtotal + hst) * 100) / 100;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        "Description",
        "Qty",
        "Unit",
        "Unit price",
        "Line total",
        "Recommendations",
      ],
    ],
    body,
    theme: "striped",
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [39, 39, 42],
      valign: "top",
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    styles: {
      cellPadding: 2.2,
      lineColor: [228, 228, 231],
      lineWidth: 0.1,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { halign: "right", cellWidth: 12 },
      2: { cellWidth: 16 },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", cellWidth: 26, fontStyle: "bold" },
      5: {
        cellWidth: 115,
        fontStyle: "normal",
        textColor: [63, 63, 70],
        fontSize: 7.5,
      },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7.5);
      doc.setTextColor(161, 161, 170);
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: "right" },
      );
    },
  });

  const docExt = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  let finalY = docExt.lastAutoTable?.finalY ?? y + 40;

  // Subtotal / HST / Total footer block
  finalY += 5;
  if (finalY > pageHeight - 50) {
    doc.addPage();
    finalY = margin;
  }
  const rightX = pageWidth - margin;
  const labelX = rightX - 44;

  doc.setDrawColor(220, 220, 224);
  doc.setLineWidth(0.25);
  doc.line(labelX - 4, finalY, rightX, finalY);
  finalY += 5;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", labelX, finalY);
  doc.text(money.format(subtotal), rightX, finalY, { align: "right" });
  finalY += 5.5;

  // HST
  doc.setTextColor(140, 155, 148);
  doc.text("HST (13%)", labelX, finalY);
  doc.text(money.format(hst), rightX, finalY, { align: "right" });
  finalY += 4;

  doc.setDrawColor(200, 200, 204);
  doc.line(labelX - 4, finalY, rightX, finalY);
  finalY += 5;

  // Total — purple bold
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(124, 58, 237);
  doc.text("Total", labelX, finalY);
  doc.text(money.format(grandTotal), rightX, finalY, { align: "right" });
  finalY += 5.5;

  // CAD disclaimer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(161, 161, 170);
  doc.text("All prices in CAD. HST included.", labelX, finalY);
  finalY += 8;

  if (safeEstimate.notes.trim()) {
    if (finalY > pageHeight - 40) {
      doc.addPage();
      finalY = margin;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(63, 63, 70);
    const noteBlock = `Notes: ${safeEstimate.notes.trim()}`;
    const noteLines = doc.splitTextToSize(noteBlock, pageWidth - 2 * margin);
    doc.text(noteLines, margin, finalY);
  }

  const safeDate = new Date().toISOString().slice(0, 10);
  doc.save(`estimate-${safeDate}.pdf`);
}
