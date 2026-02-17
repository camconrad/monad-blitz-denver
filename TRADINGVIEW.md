# TradingView Integration

This project uses TradingView for charts on the **Trade** page. This doc summarizes our setup and official best practices for when you extend or switch integration.

---

## Current Setup: Widget (iframe embed)

We use the **Advanced Chart widget** — the free, copy-paste iframe embed that uses TradingView’s data. No self-hosting or datafeed required.

- **Component:** `components/tradingview-chart.tsx`
- **Usage:** `<TradingViewChart symbol={selectedAsset} />` on `app/trade/page.tsx`
- **Docs:** [Advanced Chart widget](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/), [Widget integration](https://www.tradingview.com/widget-docs/tutorials/iframe/build-page/widget-integration/)

**Best practices that apply today:**

- **Chart size:** TradingView recommends a minimum meaningful size of **500×500 px** for charts. Our chart container uses `min-h-[500px]` so the embed stays readable.
- **Keep chart separate:** Chats, symbol lists, ads, etc. live outside the chart component; we only embed the chart and pass symbol/theme.
- **Localization:** The widget is configured with `locale: 'en'`. To support other languages, pass `locale` (e.g. from app locale) into the component.

---

## Future Option: Advanced Charts (self-hosted)

If you need **your own data** (e.g. Monad chain or a specific venue), you would switch to **Advanced Charts**: download the library, host it on your servers, and implement a datafeed. See [Getting started](https://www.tradingview.com/charting-library-docs/latest/getting_started/) and [Connecting Data](https://www.tradingview.com/charting-library-docs/latest/connecting_data/).

**Best practices when using the library:**

| Practice | Notes |
|----------|--------|
| **Separate extra features** | Chart only in the library; implement chats, symbol lists, hot deals, ads outside and integrate via the API. |
| **Data connection** | Choose Datafeed API (JS) vs UDF-compatible server. Use WebSockets for fast/streaming data. |
| **Correct data** | Most issues come from incorrect data. Follow [Datafeed API](https://www.tradingview.com/charting-library-docs/latest/connecting_data/); if you use Marks, match the requested range. |
| **Chart size** | Minimum meaningful size **500×500 px**. Hide some UI if you need a smaller chart; see Widget Constructor. |
| **Localize** | Use the library’s locale support for your users’ language. |
| **Debug in development** | Set `debug: true` in the Widget Constructor during development; disable in production. |
| **Troubleshooting** | Update to the latest build, then enable debug, check data/symbology, compare with demo data service, search GitHub Issues. |
| **No undocumented features** | Only use documented APIs; undocumented behavior can change. Do not alter the library source. |
| **No demo datafeed in production** | Demo datafeed is unstable and not for real traffic. |
| **Performance** | Prefer HTTP/2+, TLS 1.3+, and compress HTML (e.g. Gzip/Brotli). Set **minimum** cache expiration for `charting_library.js` so updates don’t serve stale file and break asset links. |

---

## References

- [Getting started](https://www.tradingview.com/charting-library-docs/latest/getting_started/)
- [Best practices](https://www.tradingview.com/charting-library-docs/latest/getting_started/best_practices/) (library integration)
- [FAQ](https://www.tradingview.com/charting-library-docs/latest/getting_started/Frequently-Asked-Questions/) (Widget vs Advanced Charts vs Trading Platform, CSP, etc.)
