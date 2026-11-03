// ZERO PROBLEMS — 비짓서울 API 프록시 (Cloudflare Worker)
// 배포: workers.cloudflare.com → Create Worker → 이 코드 붙여넣기 → Settings → Variables → Secret: VISITSEOUL_API_KEY
// 배포 주소를 config.js 의 VISITSEOUL_PROXY_URL 에 넣습니다.
const ORIGIN = "https://lkjh098-cell.github.io";
const UPSTREAM = "https://api-call.visitseoul.net";
const ALLOWED = { "/api/v1/contents/list": ["com_ctgry_sn","lang_code_id","keyword","sort_type","page_no"], "/api/v1/contents/info": ["cid"] };
const CACHE_TTL = 300; // 초. 응답 헤더 x-cache-at 로 캐시 시각을 클라이언트에 알림
export default {
  async fetch(req, env, ctxw) {
    const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Expose-Headers": "x-cache-at, x-upstream-status", "Vary": "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json({ error: "POST only" }, 405, cors);
    const origin = req.headers.get("Origin"); if (origin && origin !== ORIGIN) return json({ error: "origin not allowed" }, 403, cors);
    const url = new URL(req.url); const allowed = ALLOWED[url.pathname]; if (!allowed) return json({ error: "endpoint not allowed" }, 404, cors);
    let body; try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400, cors); }
    const clean = {}; for (const k of allowed) { if (body[k] !== undefined && body[k] !== null && body[k] !== "") { const v = String(body[k]); if (v.length > 100) return json({ error: "param too long" }, 400, cors); clean[k] = k === "page_no" ? Number(v) : v; } }
    if (url.pathname.endsWith("/info") && !clean.cid) return json({ error: "cid required" }, 400, cors);
    const key = JSON.stringify([url.pathname, clean]); const cacheReq = new Request("https://cache.local/" + encodeURIComponent(key)); const cache = caches.default;
    const hit = await cache.match(cacheReq); if (hit) { const h = new Headers(hit.headers); Object.entries(cors).forEach(([k, v]) => h.set(k, v)); return new Response(hit.body, { status: hit.status, headers: h }); }
    let up; try { up = await fetch(UPSTREAM + url.pathname, { method: "POST", headers: { "VISITSEOUL-API-KEY": env.VISITSEOUL_API_KEY, "Content-Type": "application/json", "Referer": ORIGIN + "/" }, body: JSON.stringify(clean) }); }
    catch (e) { return json({ error: "upstream unreachable" }, 502, cors); }
    if (up.status === 429) return json({ error: "rate limited" }, 429, { ...cors, "Retry-After": "30" });
    const text = await up.text(); const res = new Response(text, { status: up.status, headers: { ...cors, "Content-Type": "application/json", "x-cache-at": new Date().toISOString(), "x-upstream-status": String(up.status), "Cache-Control": `public, max-age=${CACHE_TTL}` } });
    if (up.ok) ctxw.waitUntil(cache.put(cacheReq, res.clone()));
    return res;
  }
};
function json(o, s, h) { return new Response(JSON.stringify(o), { status: s, headers: { ...h, "Content-Type": "application/json" } }); }
