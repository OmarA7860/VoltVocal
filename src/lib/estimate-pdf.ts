import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { EstimateResult } from "@/types/estimate";
import {
  sanitizeCompanyNameForPdf,
  sanitizeEstimateForPdfExport,
} from "@/lib/sanitize-ai-text";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type DownloadOptions = {
  companyName?: string;
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
    foot: [
      [
        "",
        "",
        "",
        "Total estimate",
        money.format(safeEstimate.total),
        "",
      ],
    ],
    showFoot: "lastPage",
    theme: "striped",
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      valign: "middle",
    },
    footStyles: {
      fillColor: [244, 244, 245],
      textColor: [23, 23, 23],
      fontStyle: "bold",
      fontSize: 9,
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

  if (safeEstimate.notes.trim()) {
    finalY += 8;
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
