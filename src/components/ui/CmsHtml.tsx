import { sanitizeCmsHtml } from "@/lib/content-security";

export function CmsHtml({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(html) }} />;
}
