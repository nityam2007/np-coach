"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Icon } from "@/components/ui/Icon";

/**
 * Client-side ticket export. Rasterises the boarding-pass DOM node (by id) to a PNG
 * with html-to-image, then either downloads it or wraps it in a same-size PDF with
 * jsPDF. Single source of layout — the same on-screen pass becomes the PNG/PDF.
 */
export function TicketActions({ targetId, reference }: { targetId: string; reference: string }) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  async function render(): Promise<string | null> {
    const node = document.getElementById(targetId);
    if (!node) return null;
    return toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
  }

  async function downloadPng() {
    setBusy("png");
    try {
      const url = await render();
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.download = `NP-Coaches-${reference}.png`;
      a.click();
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setBusy("pdf");
    try {
      const url = await render();
      if (!url) return;
      const img = new Image();
      img.src = url;
      await img.decode();
      const pdf = new jsPDF({
        orientation: img.width >= img.height ? "landscape" : "portrait",
        unit: "px",
        format: [img.width, img.height],
      });
      pdf.addImage(url, "PNG", 0, 0, img.width, img.height);
      pdf.save(`NP-Coaches-${reference}.pdf`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={downloadPdf}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Icon name="download" className="h-4 w-4" />
        {busy === "pdf" ? "Preparing…" : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={downloadPng}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-5 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy/5 disabled:opacity-60"
      >
        <Icon name="download" className="h-4 w-4" />
        {busy === "png" ? "Preparing…" : "Download PNG"}
      </button>
    </div>
  );
}
