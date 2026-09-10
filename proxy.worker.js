// Cloudflare Worker — 비짓서울 API 프록시 (무료 플랜으로 충분)
// 1) workers.cloudflare.com 에서 Worker 생성 → 이 코드 붙여넣기
// 2) Settings → Variables 에 VISITSEOUL_API_KEY 등록 (Secret)
// 3) 배포 주소를 config.js 의 VISITSEOUL_PROXY_URL 에 기입, DATA_SOURCE 를 "visitseoul" 로
const ALLOW = "https://lkjh098-cell.github.io";
export default {
  async fetch(req, env) {
    const cors = { "Access-Control-Allow-Origin": ALLOW, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
    const url = new URL(req.url);
    if (!["/api/v1/contents/list", "/api/v1/contents/info"].includes(url.pathname)) return new Response("not found", { status: 404, headers: cors });
    const body = await req.text();
    const r = await fetch("https://api-call.visitseoul.net" + url.pathname, { method: "POST", headers: { "VISITSEOUL-API-KEY": env.VISITSEOUL_API_KEY, "Content-Type": "application/json", "Referer": ALLOW + "/" }, body });
    return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=600" } });
  }
};
