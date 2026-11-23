"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { cellText, totalsFor } from "@/lib/columns";
import { companyName, generatedText, signatureLabels, type ExportSpec } from "@/lib/export";
import { Button } from "./ui";

/** Professional A4 print layout rendered in a portal; only this element is printed (the app shell is hidden in @media print). */
export function PrintSheet({ spec, onClose, autoPrint }: { spec: ExportSpec; onClose: () => void; autoPrint?: boolean }) {
  const [orientation, setOrientation] = useState(spec.orientation);
  const [mounted, setMounted] = useState(false);
  const s = spec.settings;
  const ctx = { settings: s };
  const totals = useMemo(() => totalsFor(spec.columns, spec.rows), [spec.columns, spec.rows]);
  const hasTotals = Object.keys(totals).length > 0;
  const logo = s["company.logo"] || "/logo.svg";

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!mounted || !autoPrint) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [mounted, autoPrint]);

  if (!mounted) return null;
  const footer = (s["print.footer"] || companyName(s)).replace(/["\\]/g, "");
  const pageCss = `@page { size: A4 ${orientation}; margin: 12mm 11mm 15mm 11mm; @bottom-left { content: "${footer}"; font-size: 8px; color: #64748b; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8px; color: #64748b; } }`;

  return createPortal(
    <div className="print-portal fixed inset-0 z-[90] overflow-auto bg-slate-900/90 p-4 backdrop-blur-sm">
      <style>{pageCss}</style>
      <div className="no-print sticky top-0 z-10 mx-auto mb-4 flex max-w-[1100px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-solid p-3 text-fg shadow-xl">
        <div>
          <p className="text-sm font-bold">Print Preview — {spec.title}</p>
          <p className="text-xs text-muted">A4 · {spec.rows.length} record(s). Table headers repeat on every page; page numbers appear on printed pages.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-line p-1">
            {(["portrait", "landscape"] as const).map((o) => (
              <button key={o} onClick={() => setOrientation(o)} className={`h-8 rounded-lg px-3 text-xs font-semibold capitalize ${orientation === o ? "bg-accent text-white" : "text-muted hover:text-fg"}`}>{o}</button>
            ))}
          </div>
          <Button variant="primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button onClick={onClose}><X className="h-4 w-4" /> Close</Button>
        </div>
      </div>

      <div className="paper mx-auto bg-white p-[12mm] shadow-2xl" style={{ width: orientation === "portrait" ? "210mm" : "297mm", maxWidth: "100%", minHeight: orientation === "portrait" ? "297mm" : "210mm" }}>
        <div className="sheet">
          {/* Letterhead */}
          <div className="flex items-start justify-between gap-4 border-b-2 border-[#1e3a8a] pb-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="Logo" style={{ height: 54, width: "auto" }} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{companyName(s)}</div>
                <div style={{ color: "#475569", fontSize: 10 }}>{[s["company.address"], s["company.phone"], s["company.email"], s["company.website"]].filter(Boolean).join("  |  ")}</div>
              </div>
            </div>
            <div className="text-right">
              <div style={{ color: "#1e3a8a", fontWeight: 700, fontSize: 11 }}>{spec.department}</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{spec.title}</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-2 py-2" style={{ color: "#475569", fontSize: 10 }}>
            <span>Generated: <b>{generatedText(s)}</b>{spec.generatedBy ? ` by ${spec.generatedBy}` : ""}</span>
            <span>Period: <b>{spec.rangeText || "All dates"}</b></span>
            <span>Records: <b>{spec.rows.length}</b></span>
            {spec.filtersText && <span className="w-full">Filters: {spec.filtersText}</span>}
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: 28 }}>#</th>
                {spec.columns.map((c) => <th key={c.key} className={c.type === "money" || c.type === "number" ? "num" : ""}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {spec.rows.length === 0 && <tr><td colSpan={spec.columns.length + 1} style={{ textAlign: "center", padding: 18, color: "#64748b" }}>No records found for the selected filters.</td></tr>}
              {spec.rows.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {spec.columns.map((c) => <td key={c.key} className={c.type === "money" || c.type === "number" ? "num" : ""}>{cellText(c, r, ctx)}</td>)}
                </tr>
              ))}
              {hasTotals && spec.rows.length > 0 && (
                <tr className="totals">
                  <td></td>
                  {spec.columns.map((c, i) => <td key={c.key} className={c.sum ? "num" : ""}>{c.sum ? cellText({ ...c, ref: false }, { [c.key]: totals[c.key] }, ctx) : i === 0 ? "Total" : ""}</td>)}
                </tr>
              )}
            </tbody>
          </table>

          {spec.summary && spec.summary.length > 0 && (
            <div className="sig-block" style={{ marginTop: 14, maxWidth: 320 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Summary</div>
              <table>
                <tbody>{spec.summary.map((x) => <tr key={x.label}><td>{x.label}</td><td className="num" style={{ fontWeight: 700 }}>{x.value}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {spec.signatures && (
            <div className="sig-block flex gap-8" style={{ marginTop: 48 }}>
              {signatureLabels(s).map((l) => (
                <div key={l} style={{ flex: 1 }}>
                  <div style={{ borderTop: "1px solid #475569", paddingTop: 4, color: "#475569", fontSize: 10 }}>{l}</div>
                </div>
              ))}
            </div>
          )}
          <div className="screen-only" style={{ marginTop: 24, borderTop: "1px solid #cbd5e1", paddingTop: 6, color: "#64748b", fontSize: 9 }}>
            {footer} — footer and “Page X of Y” are added automatically on every printed page.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
