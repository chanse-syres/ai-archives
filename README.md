This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



## Scraping latency metrics

The `POST /api/conversation` route now records in-memory scraping latency metrics for the current server process.

- `parseDurationMs` measures the HTML-to-conversation parsing step.
- `totalDurationMs` measures the full request handling path after the request reaches the API route.
- Percentiles are exposed as p50 and p90 over the latest 200 samples.
- Inspect the latest snapshot at `GET /api/metrics/scraping`.
- Each successful `POST /api/conversation` response also includes `scrapeMetrics.latestMeasurement` and `scrapeMetrics.percentileSnapshot` for quick local verification.
- Each successful scrape also writes a `[scrape-metrics]` log entry to the server logs with the latest sample plus the current p50/p90 summary.

### How to show this task is complete

1. Start the app with `npm run dev`.
2. Trigger the scraper several times from the extension on representative conversations.
3. In the terminal running Next.js, capture the `[scrape-metrics]` log line that shows:
   - the latest `parseDurationMs` and `totalDurationMs`
   - the rolling `p50Ms` and `p90Ms` values
   - the total sample count used for the percentile window
4. Open `GET /api/metrics/scraping` in the browser or with `curl http://localhost:3000/api/metrics/scraping` and include that JSON in your demo/QA note.
5. Mark the task complete once you can show at least one real scrape run with non-null `p50Ms` and `p90Ms` values.
