### Real-Time Crypto Price Streamer

A full-stack TypeScript application that streams live cryptocurrency prices from [TradingView](https://www.tradingview.com) using Playwright automation. Built with Next.js (frontend) and Node.js (backend), it demonstrates real-time data streaming, inter-process communication, and efficient browser resource sharing.

#### Features

* Streams live prices for cryptocurrencies (BTCUSD, ETHUSD, SOLUSD, etc.) directly from TradingView (BINANCE exchange).
* Add or remove tickers dynamically via the UI.
* Real-time price updates with minimal latency using a push-based architecture via ConnectRPC.
* Scalable backend architecture supporting multiple concurrent clients with efficient Playwright session reuse.
* Visibility enabled (headed Playwright mode) for transparent browser automation.

* Look at [demo.gif](./demo.gif) for demo

#### Tech Stack

* **Frontend:** Next.js, TypeScript, React
* **Backend:** Node.js, tsx, ConnectRPC
* **Automation:** Playwright
* **Package Manager:** pnpm

#### Setup & Run

```bash
pnpm install --recursive
./run.sh
```

Open your browser at [http://localhost:3000](http://localhost:3000) to interact with the app.

#### Learning Highlights

* Implemented real-time streaming pipelines with ConnectRPC.
* Managed concurrent browser sessions efficiently using Playwright.
* Explored low-latency data delivery between backend and frontend.
