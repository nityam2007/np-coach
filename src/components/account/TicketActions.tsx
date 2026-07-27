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
async function waitForImages(root: HTMLElement) {
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }
      await image.decode().catch(() => undefined);
    }),
  );
}

export function TicketActions({ targetId, reference }: { targetId: string; reference: string }) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  async function render(): Promise<{ dataUrl: string; width: number; height: number } | null> {
    const node = document.getElementById(targetId);
    if (!node) return null;

    // Capturing the live `mx-auto` node lets its auto margins shift the cloned ticket
    // inside html-to-image's fixed canvas. At 3× that clipped the right/bottom edge.
    // Render a fixed-size clone inside a padded export surface instead, so shadows,
    // rounded corners and the tear-off stub are always fully inside the bitmap.
    const bounds = node.getBoundingClientRect();
    const ticketWidth = Math.ceil(Math.max(bounds.width, node.scrollWidth));
    const padding = 32;
    const clone = node.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    Object.assign(clone.style, {
      boxSizing: "border-box",
      margin: "0",
      maxWidth: "none",
      width: `${ticketWidth}px`,
    });

    const exportRoot = document.createElement("div");
    Object.assign(exportRoot.style, {
      background: "#ffffff",
      boxSizing: "border-box",
      left: "0",
      padding: `${padding}px`,
      pointerEvents: "none",
      position: "fixed",
      top: "0",
      width: `${ticketWidth + padding * 2}px`,
      zIndex: "-1",
    });
    exportRoot.appendChild(clone);
    document.body.appendChild(exportRoot);

    try {
      await document.fonts.ready;
      await waitForImages(exportRoot);
      const width = Math.ceil(exportRoot.getBoundingClientRect().width);
      const height = Math.ceil(exportRoot.scrollHeight);
      const dataUrl = await toPng(exportRoot, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
        width,
        height,
        style: { left: "auto", position: "static", top: "auto", zIndex: "auto" },
      });
      return { dataUrl, width, height };
    } finally {
      exportRoot.remove();
    }
  }

  async function downloadPng() {
    setBusy("png");
    try {
      const image = await render();
      if (!image) return;
      const url = image.dataUrl;
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
      const image = await render();
      if (!image) return;
      const url = image.dataUrl;
      const landscape = image.width >= image.height;
      const pdf = new jsPDF({
        orientation: landscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const pageWidth = landscape ? 297 : 210;
      const pageHeight = landscape ? 210 : 297;
      const scale = Math.min((pageWidth - 24) / image.width, (pageHeight - 24) / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      pdf.addImage(url, "PNG", (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, "FAST");
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
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-brand-hover hover:shadow-md disabled:opacity-60"
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
