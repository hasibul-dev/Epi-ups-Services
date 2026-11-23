import { cellText, totalsFor, type Col } from "./columns";
import { formatDateTime } from "./utils";

export interface ExportSpec {
  title: string;
  department: string;
  columns: Col[];
  rows: Record<string, unknown>[];
  settings: Record<string, string>;
  orientation: "portrait" | "landscape";
  rangeText?: string;
  filtersText?: string;
  summary?: { label: string; value: string }[];
  signatures?: boolean;
  generatedBy?: string;
}

export function companyName(s: Record<string, string>) {
  return s["company.name"] || "EPI UPS (Bangladesh) Limited";
}

export function generatedText(s: Record<string, string>) {
  return formatDateTime(new Date(), s["format.timezone"] || "Asia/Dhaka", s["format.date"] || "DD MMM YYYY");
}

export function tableData(spec: ExportSpec) {
  const ctx = { settings: spec.settings };
  const head = ["#", ...spec.columns.map((c) => c.label)];
  const body = spec.rows.map((r, i) => [String(i + 1), ...spec.columns.map((c) => cellText(c, r, ctx))]);
  const totals = totalsFor(spec.columns, spec.rows);
  const hasTotals = Object.keys(totals).length > 0;
  const totalsRow = hasTotals ? ["", ...spec.columns.map((c, i) => (c.sum ? cellText({ ...c, ref: false }, { [c.key]: totals[c.key] }, ctx) : i === 0 ? "Total" : ""))] : null;
  return { head, body, totalsRow };
}

export function signatureLabels(s: Record<string, string>): string[] {
  return (s["print.signatures"] || "Prepared By,Checked By,Approved By").split(",").map((x) => x.trim()).filter(Boolean);
}

async function getLogo(settings: Record<string, string>): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const src = settings["company.logo"] || "/logo.svg";
    const img = new Image();
    img.src = src;
    await img.decode();
    const w = 420;
    const h = Math.round((w * (img.naturalHeight || 270)) / (img.naturalWidth || 400));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL("image/png"), w, h };
  } catch {
    return null;
  }
}

const pdfSafe = (s: string) => s.replace(/৳/g, "Tk ").replace(/[^\x00-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022]/g, "?");
const safeName = (s: string) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase();

export async function exportPdf(spec: ExportSpec) {
  const [{ jsPDF }, atMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = atMod.default;
  const doc = new jsPDF({ orientation: spec.orientation, unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const s = spec.settings;
  const logo = await getLogo(s);
  const { head, body, totalsRow } = tableData(spec);

  // First-page header
  const lw = 22;
  const lh = logo ? (lw * logo.h) / logo.w : 0;
  if (logo) doc.addImage(logo.dataUrl, "PNG", 12, 10, lw, lh);
  const tx = 12 + (logo ? lw + 4 : 0);
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(17, 24, 39).text(pdfSafe(companyName(s)), tx, 16);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(90, 100, 120);
  doc.text(pdfSafe([s["company.address"], s["company.phone"], s["company.email"]].filter(Boolean).join("  |  ")), tx, 21);
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30, 58, 138).text(pdfSafe(spec.department), pageW - 12, 14, { align: "right" });
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(17, 24, 39).text(pdfSafe(spec.title), pageW - 12, 20, { align: "right" });
  doc.setDrawColor(30, 58, 138).setLineWidth(0.6).line(12, 10 + Math.max(lh, 16) + 2, pageW - 12, 10 + Math.max(lh, 16) + 2);

  let y = 10 + Math.max(lh, 16) + 7;
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(70, 80, 100);
  doc.text(`Generated: ${generatedText(s)}${spec.generatedBy ? `  by ${pdfSafe(spec.generatedBy)}` : ""}`, 12, y);
  doc.text(`Period: ${pdfSafe(spec.rangeText || "All dates")}   |   Records: ${spec.rows.length}`, pageW - 12, y, { align: "right" });
  if (spec.filtersText) {
    y += 4.5;
    doc.text(`Filters: ${pdfSafe(spec.filtersText)}`, 12, y);
  }
  y += 4;

  const numericIdx = spec.columns.map((c, i) => (c.type === "money" || c.type === "number" ? i + 1 : -1)).filter((i) => i >= 0);
  const columnStyles: Record<number, { halign: "right" | "left"; cellWidth?: number }> = { 0: { halign: "left", cellWidth: 9 } };
  for (const i of numericIdx) columnStyles[i] = { halign: "right" };

  autoTable(doc, {
    head: [head.map(pdfSafe)],
    body: body.map((r) => r.map(pdfSafe)),
    foot: totalsRow ? [totalsRow.map(pdfSafe)] : undefined,
    showFoot: "lastPage",
    startY: y,
    margin: { top: 18, left: 12, right: 12, bottom: 16 },
    styles: { fontSize: 8, cellPadding: 1.8, overflow: "linebreak", lineColor: [203, 213, 225], lineWidth: 0.1, textColor: [17, 24, 39] },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    footStyles: { fillColor: [226, 232, 240], textColor: [17, 24, 39], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    rowPageBreak: "avoid",
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(100, 110, 130);
        doc.text(pdfSafe(`${companyName(s)} — ${spec.title}`), 12, 10);
        doc.setDrawColor(203, 213, 225).setLineWidth(0.2).line(12, 12, pageW - 12, 12);
      }
    },
  });

  // Summary + signatures
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fy: number = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
  if (spec.summary?.length) {
    if (fy > pageH - 40) { doc.addPage(); fy = 22; }
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(17, 24, 39).text("Summary", 12, fy);
    fy += 5;
    doc.setFont("helvetica", "normal").setFontSize(9);
    for (const item of spec.summary) {
      doc.text(pdfSafe(item.label), 14, fy);
      doc.text(pdfSafe(item.value), 80, fy, { align: "right" });
      fy += 5;
    }
    fy += 3;
  }
  if (spec.signatures) {
    const labels = signatureLabels(s);
    if (fy > pageH - 45) { doc.addPage(); fy = 24; }
    fy += 14;
    const w = (pageW - 24) / labels.length;
    labels.forEach((l, i) => {
      const x = 12 + i * w + 4;
      doc.setDrawColor(90, 100, 120).setLineWidth(0.3).line(x, fy, x + w - 14, fy);
      doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(70, 80, 100).text(pdfSafe(l), x, fy + 4.5);
    });
  }

  // Footer with page numbers
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225).setLineWidth(0.2).line(12, pageH - 12, pageW - 12, pageH - 12);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(100, 110, 130);
    doc.text(pdfSafe(s["print.footer"] || companyName(s)), 12, pageH - 7.5);
    doc.text(`Page ${i} of ${n}`, pageW - 12, pageH - 7.5, { align: "right" });
  }
  doc.save(`${safeName(spec.title)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportExcel(spec: ExportSpec) {
  const XLSX = await import("xlsx");
  const s = spec.settings;
  const { head, body, totalsRow } = tableData(spec);
  const aoa: (string | number)[][] = [
    [companyName(s)],
    [spec.department],
    [spec.title],
    [`Generated: ${generatedText(s)}`, "", `Period: ${spec.rangeText || "All dates"}`],
    spec.filtersText ? [`Filters: ${spec.filtersText}`] : [],
    [],
    head,
  ];
  const headerRow = aoa.length - 1;
  spec.rows.forEach((r, i) => {
    aoa.push([
      i + 1,
      ...spec.columns.map((c, ci) => {
        if ((c.type === "money" || c.type === "number") && r[c.key] != null && r[c.key] !== "") return Number(r[c.key]);
        return body[i][ci + 1];
      }),
    ]);
  });
  if (totalsRow) {
    const totals = totalsFor(spec.columns, spec.rows);
    aoa.push(["", ...spec.columns.map((c, i) => (c.sum ? totals[c.key] : i === 0 ? "Total" : ""))]);
  }
  if (spec.summary?.length) {
    aoa.push([]);
    for (const it of spec.summary) aoa.push(["", it.label, it.value]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = head.map((h, i) => ({ wch: i === 0 ? 5 : Math.min(40, Math.max(12, h.length + 4, ...body.slice(0, 60).map((r) => (r[i] ?? "").length + 2))) }));
  // number formats
  spec.columns.forEach((c, ci) => {
    if (c.type === "money" || c.type === "number") {
      for (let r = headerRow + 1; r < headerRow + 2 + spec.rows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: ci + 1 })];
        if (cell && typeof cell.v === "number") cell.z = c.type === "money" ? "#,##0.00" : "#,##0";
      }
    }
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, spec.title.slice(0, 31).replace(/[\\/?*[\]:]/g, " "));
  XLSX.writeFile(wb, `${safeName(spec.title)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
