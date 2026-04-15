const fs = require('fs');
const largeTest = fs.readFileSync('public/large_test.mp4').toString('base64');
fetch('http://localhost:3000/api/audit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'test', contextFiles: [{ mimeType: 'text/plain', data: largeTest }] })
}).then(async r => {
  console.log("STATUS:", r.status);
  console.log("TEXT:", await r.text());
}).catch(e => console.error(e));
