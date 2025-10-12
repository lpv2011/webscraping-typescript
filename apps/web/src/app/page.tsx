"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { priceClient } from "../lib/rpcClient";
import { SubscribeRequest } from "@rpc/price/v1/price_pb";

type Row = { symbol: string; price?: number };

export default function Page() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const controllersRef = useRef<Record<string, AbortController>>({});

  const addTicker = async () => {
    const sym = input.toUpperCase().trim();
    if (!sym) return;
    setInput("");

    if (rows.find((r) => r.symbol === sym)) return;
    setRows((prev) => [...prev, { symbol: sym }].sort((a, b) => a.symbol.localeCompare(b.symbol)));

    console.log("[web] subscribe", sym);

    const controller = new AbortController();
    controllersRef.current[sym] = controller;

    (async () => {
      try {
        const req = new SubscribeRequest({ symbol: sym });
        const signal = controller.signal;
        for await (const up of priceClient.subscribeTicker(req, { signal })) {
          console.log("[web] recv", up.symbol, up.price);
          setRows((prev) =>
            prev
              .map((r) => (r.symbol === sym ? { ...r, price: up.price } : r))
              .sort((a, b) => a.symbol.localeCompare(b.symbol)),
          );
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.log("[web] stream aborted", sym);
        } else {
          console.error("[web] stream error", e);
        }
      } finally {
        delete controllersRef.current[sym];
      }
    })();
  };

  const remove = (sym: string) => {
    const controller = controllersRef.current[sym];
    if (controller) {
      controller.abort();
    }
    setRows((prev) => prev.filter((r) => r.symbol !== sym));
  };

  useEffect(() => {
    return () => {
      for (const sym in controllersRef.current) {
        controllersRef.current[sym].abort();
      }
    };
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <input
        placeholder="Ticker name here"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addTicker()}
        style={{ marginRight: 8 }}
      />
      <button onClick={addTicker}>Add</button>

      <div style={{ marginTop: 12 }}>
        {rows.map((r) => (
          <div key={r.symbol} style={{ marginBottom: 10 }}>
            <div>{r.symbol}</div>
            <div>{r.price !== undefined ? r.price : "…"}</div>
            <button onClick={() => remove(r.symbol)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}