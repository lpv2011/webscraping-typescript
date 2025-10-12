import { chromium, Browser, Page, WebSocket } from "playwright";

type PriceEvent = { symbol: string; price: number; ts_ms: number };
type Subscriber = (ev: PriceEvent) => void;

export class PlaywrightManager {
  private browser?: Browser;
  private pages = new Map<string, Page>();
  private subs = new Map<string, Set<Subscriber>>();

  private async ensureBrowser() {
    if (!this.browser) {
      console.log("[server] launching Playwright (headed)...");
      this.browser = await chromium.launch({
        headless: false,
        args: ["--disable-blink-features=AutomationControlled"],
      });
    }
    return this.browser;
  }

  private normalizeForBinance(key: string): string {
    const k = key.toUpperCase().trim();
    return k;
  }
  private expectedName(key: string): string {
    return `BINANCE:${this.normalizeForBinance(key)}`;
  }

  private buildTvUrl(sym: string): string {
    const S = this.normalizeForBinance(sym);
    return `https://www.tradingview.com/symbols/${S}/?exchange=BINANCE`;
  }

  private matchesTargetInstrument(frameSymbol: unknown, key: string): boolean {
    return typeof frameSymbol === "string"
      && frameSymbol.toUpperCase() === this.expectedName(key);
  }

  private pickPrice(v: any): number | null {
    if (!v || typeof v !== "object") return null;
    const candidates = [
      "lp",
      "price",
      "last_price",
      "regular_market_last",
      "regular_market_price",
      "regular_last",
    ];
    for (const k of candidates) {
      const val = v[k];
      const n =
        typeof val === "number"
          ? val
          : typeof val === "string"
          ? parseFloat(val)
          : NaN;
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }

  private tryExtractPriceFromFrame(data: string, key: string): number | null {
    try {
      const parts = data.split("~m~").filter(Boolean);
      for (const token of parts) {
        if (/^\d+$/.test(token)) continue;
        const obj = this.safeJsonParse<any>(token);
        if (!obj || typeof obj !== "object") continue;

        if (obj.m === "qsd" && Array.isArray(obj.p) && obj.p.length >= 2) {
          const payload = obj.p[1];
          if (payload && typeof payload === "object") {
            const frameN = payload.n;
            if (this.matchesTargetInstrument(frameN, key)) {
              const price = this.pickPrice(payload.v);
              if (price !== null) return price;
            }
          }
        }

        if (obj.m === "du" && obj.p && typeof obj.p === "object") {
          const nested = JSON.stringify(obj.p);
          const quick =
            /"n"\s*:\s*"(?:[A-Z]+:)?${key}"/.test(nested) &&
            (/"lp"\s*:\s*"?(-?\d+(?:\.\d+)?)"?/.exec(nested) ||
              /"price"\s*:\s*"?(-?\d+(?:\.\d+)?)"?/.exec(nested) ||
              /"last_price"\s*:\s*"?(-?\d+(?:\.\d+)?)"?/.exec(nested) ||
              /"regular_market_(?:last|price)"\s*:\s*"?(-?\d+(?:\.\d+)?)"?/.exec(nested));
          if (quick && quick[1]) {
            const v = parseFloat(quick[1]);
            if (Number.isFinite(v) && v > 0) return v;
          }
        }
      }
    } catch {
    }
    return null;
  }

  private safeJsonParse<T = unknown>(s: string): T | null {
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  }

  private async ensurePage(symbol: string) {
    const key = symbol.toUpperCase().trim();
    let page = this.pages.get(key);
    if (page) return page;

    const browser = await this.ensureBrowser();
    const ctx = await browser.newContext();
    page = await ctx.newPage();
    page.on("websocket", (ws: WebSocket) => {
      console.log(`[ws:${key}] OPEN ${ws.url()}`);

      ws.on("framereceived", (event) => {
        const data = event.payload.toString();
        const price = this.tryExtractPriceFromFrame(data, key);
        if (price !== null) {
          this.emitPrice(key, price);
        }
      });

      ws.on("close", () => {
        console.log(`[ws:${key}] CLOSE ${ws.url()}`);
      });
    });

    page.on("console", (msg) => {
      const line = `[page:${key}] console.${msg.type()}: ${msg.text()}`;
      if (msg.type() === "error") console.error(line);
      else console.log(line);
    });
    page.on("pageerror", (err) => console.error(`[page:${key}] pageerror:`, err));

    const url = this.buildTvUrl(key);
    console.log(`[server] opening ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    this.pages.set(key, page);
    return page;
  }

  private emitPrice(symbol: string, price: number) {
    const ts = Date.now();
    console.log(`[server][${symbol}] price=${price} @ ${ts}`);

    const set = this.subs.get(symbol);
    if (set) {
      const ev: PriceEvent = { symbol, price, ts_ms: ts };
      for (const s of set) s(ev);
    }
  }

  async addSubscriber(symbol: string, fn: Subscriber): Promise<() => void> {
    const key = symbol.toUpperCase().trim();
    let set = this.subs.get(key);
    if (!set) {
      set = new Set();
      this.subs.set(key, set);
      await this.ensurePage(key);
    }
    set.add(fn);
    console.log(`[server] +subscriber(${key}) total=${set.size}`);

    return () => {
      const s = this.subs.get(key);
      if (!s) return;
      s.delete(fn);
      console.log(`[server] -subscriber(${key}) total=${s.size}`);
    };
  }
}
