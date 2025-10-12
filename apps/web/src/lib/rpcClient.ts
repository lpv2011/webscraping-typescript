"use client";

import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { PriceService } from "@rpc/price/v1/price_connect";

export const priceClient = createPromiseClient(
  PriceService,
  createConnectTransport({
    baseUrl: "http://127.0.0.1:8080",
    useBinaryFormat: false,
  })
);
