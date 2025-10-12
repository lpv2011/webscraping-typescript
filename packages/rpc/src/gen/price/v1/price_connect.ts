import { PriceUpdate, SubscribeRequest } from "./price_pb";

const MK = { Unary: 0, ServerStreaming: 1, ClientStreaming: 2, BiDiStreaming: 3 } as const;

export const PriceService = {
  typeName: "price.v1.PriceService",
  methods: {
    subscribeTicker: {
      name: "SubscribeTicker",
      I: SubscribeRequest,
      O: PriceUpdate,
      kind: MK.ServerStreaming,
    },
  },
} as const;
