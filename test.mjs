const res = await fetch('http://localhost:3002/api/audit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    url: 'test', 
    briefText: '', 
    inspirationUrl: '', 
    contextFiles: [], 
    uploadedFiles: ['/uploads/fake.jpg'] 
  })
});
const text = await res.text();
console.log("STATUS:", res.status);
console.log("BODY:", text.substring(0, 1000));
