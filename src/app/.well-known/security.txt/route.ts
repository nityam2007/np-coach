export function GET() {
  return new Response(
    [
      "Contact: mailto:Info@np-coaches.co.uk",
      "Canonical: https://np-coaches.co.uk/.well-known/security.txt",
      "Preferred-Languages: en",
      "Policy: https://np-coaches.co.uk/privacy-policy",
      "Expires: 2027-08-20T00:00:00.000Z",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } },
  );
}
