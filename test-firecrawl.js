require('dotenv').config({ path: '.env.local' });
const FirecrawlApp = require('@mendable/firecrawl-js').default;
async function test() {
  const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
  const url = "https://example.com";
  const res = await app.scrape(url, { formats: ['markdown'] });
  console.log("Success:", res.success);
  console.log("Markdown directly on res:", !!res.markdown);
  console.log("Markdown in res.data:", !!(res.data && res.data.markdown));
  console.log("Content:", res);
}
test();
