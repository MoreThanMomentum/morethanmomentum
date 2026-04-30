// DEPRECATED — appointment booking is no longer routed through this endpoint.
// The hero card now embeds the GHL calendar directly via {{GHL_CALENDAR_EMBED_URL}},
// which handles contact creation and booking inside GHL itself. This file should
// be `git rm`'d at next commit; the stub below exists only so any orphan
// bookmarked URL returns a clean 410 Gone instead of a 500.
export async function onRequest() {
  return new Response(
    JSON.stringify({ error: 'Endpoint deprecated. Booking now handled by embedded GHL calendar.' }),
    { status: 410, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}
