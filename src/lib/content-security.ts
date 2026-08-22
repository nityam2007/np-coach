import sanitizeHtml from "sanitize-html";

const allowedTags = ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td", "caption"] as const;

export function sanitizeCmsHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [...allowedTags],
    allowedAttributes: { a: ["href", "title", "target", "rel"], th: ["scope", "colspan", "rowspan"], td: ["colspan", "rowspan"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { a: ["http", "https", "mailto", "tel"] },
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, ...(/^https?:\/\//i.test(attribs.href ?? "") ? { rel: "noopener noreferrer" } : {}) },
      }),
    },
  });
}

export function safeCmsUrl(value: string, fallback = "/"): string {
  const url = value.trim();
  if (/^\/(?!\/)/.test(url) || /^https:\/\//i.test(url) || /^(mailto|tel):/i.test(url)) return url;
  return fallback;
}
