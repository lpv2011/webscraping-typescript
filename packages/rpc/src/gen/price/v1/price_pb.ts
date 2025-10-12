import { proto3, type Message } from "@bufbuild/protobuf";

export interface SubscribeRequest extends Message<SubscribeRequest> {
  symbol: string;
}
export const SubscribeRequest = proto3.makeMessageType<SubscribeRequest>(
  "price.v1.SubscribeRequest",
  () => [
    { no: 1, name: "symbol", kind: "scalar", T: 9 /* string */ },
  ],
);

export interface PriceUpdate extends Message<PriceUpdate> {
  symbol: string;
  price: number;
  tsMs: bigint;
}
export const PriceUpdate = proto3.makeMessageType<PriceUpdate>(
  "price.v1.PriceUpdate",
  () => [
    { no: 1, name: "symbol", kind: "scalar", T: 9 /* string */ },
    { no: 2, name: "price",  kind: "scalar", T: 1 /* double */ },
    { no: 3, name: "ts_ms",  kind: "scalar", T: 3 /* int64 */, L: 0 },
  ],
);
