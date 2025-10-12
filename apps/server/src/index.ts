import http from "node:http";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { ConnectRouter } from "@connectrpc/connect";
import { PriceService } from "@rpc/price/v1/price_connect";
import { PriceUpdate } from "@rpc/price/v1/price_pb";
import { PlaywrightManager } from "./playwrightManager";

const manager = new PlaywrightManager();

class PushStream<T> implements AsyncIterable<T> {
  private q: T[] = [];
  private res: ((r: IteratorResult<T>) => void)[] = [];
  private ended = false;

  push(v: T) {
    if (this.ended) return;
    const r = this.res.shift();
    if (r) r({ value: v, done: false });
    else this.q.push(v);
  }
  end() {
    if (this.ended) return;
    this.ended = true;
    for (const r of this.res) r({ value: undefined as any, done: true });
    this.res = [];
  }
  [Symbol.asyncIterator]() {
    return {
      next: () =>
        new Promise<IteratorResult<T>>((resolve) => {
          const v = this.q.shift();
          if (v !== undefined) resolve({ value: v, done: false });
          else if (this.ended) resolve({ value: undefined as any, done: true });
          else this.res.push(resolve);
        }),
    };
  }
}

function routes(router: ConnectRouter) {
  router.service(PriceService, {
    async *subscribeTicker(req, _ctx) {
      const symbol = req.symbol.toUpperCase().trim();
      console.log(`[server] SubscribeTicker(${symbol})`);

      const stream = new PushStream<PriceUpdate>();

      const unsubscribe = await manager.addSubscriber(symbol, (ev) => {
        stream.push(
          new PriceUpdate({
            symbol: ev.symbol,
            price: ev.price,
            tsMs: BigInt(ev.ts_ms),
          }),
        );
      });

      try {
        for await (const msg of stream) {
          yield msg;
        }
      } finally {
        console.log(`[server] unsubscribe(${symbol})`);
        await unsubscribe();
        stream.end();
      }
    },
  });
}

const handler = connectNodeAdapter({ routes });

function setCors(req: http.IncomingMessage, res: http.ServerResponse) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "false");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "*",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Connect-Protocol-Version, Connect-Content-Encoding",
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

const server = http.createServer((req, res) => {
  setCors(req, res);

  const ct = String(req.headers["content-type"] || "");
  console.log(`[server] HTTP ${req.method} ${req.url} ct=${ct}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const started = Date.now();
  res.on("finish", () =>
    console.log(
      `[server] ${req.method} ${req.url} -> ${res.statusCode} in ${Date.now() - started}ms`,
    ),
  );

  handler(req, res);
});

const PORT = 8080;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] ConnectRPC listening on http://0.0.0.0:${PORT}`);
});
