// Header names shared by the client and the server.
//
// Deliberately its own module with no imports. `actor.ts` pulls in
// `next/headers` to read the session, which makes it server-only — and the
// browser fetch helper needs these constants. Keeping them here stops a client
// bundle from dragging in server code just to name a header.

/** A member UUID. Only honoured when demo personas are enabled. */
export const MEMBER_HEADER = 'x-kpai-member'

/** A demo persona role. Only honoured when demo personas are enabled. */
export const PERSONA_HEADER = 'x-kpai-persona'
