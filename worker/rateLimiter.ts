import { DurableObject } from "cloudflare:workers";

export class RateLimiter extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // レート制限チェック
    // /limit?key=IP&limit=10&window=60
    if (url.pathname === "/limit") {
      const key = url.searchParams.get("key");
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const windowSec = parseInt(url.searchParams.get("window") || "60");
      
      if (!key) return new Response("Missing key", { status: 400 });

      const currentWindow = Math.floor(Date.now() / 1000 / windowSec);
      const storageKey = `limit:${key}:${currentWindow}`;
      
      let count = (await this.ctx.storage.get<number>(storageKey)) || 0;
      
      if (count >= limit) {
        return new Response("Rate limit exceeded", { status: 429 });
      }
      
      count++;
      await this.ctx.storage.put(storageKey, count, { expirationTtl: windowSec * 2 });
      
      return new Response("OK", { status: 200 });
    }

    // Nonce使用チェック (再利用防止)
    // /nonce?val=...
    if (url.pathname === "/nonce") {
        const nonce = url.searchParams.get("val");
        if (!nonce) return new Response("Missing nonce", { status: 400 });

        const key = `nonce:${nonce}`;
        const exists = await this.ctx.storage.get(key);
        
        if (exists) {
            return new Response("Nonce already used", { status: 409 });
        }

        // Nonceを保存 (5分間有効)
        await this.ctx.storage.put(key, true, { expirationTtl: 300 });
        return new Response("OK", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  }
}
