import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3002");
  
  // Wait for the file input to be available
  await page.waitForSelector("input[type=file]");
  
  // Create a fake file and upload it
  await page.setInputFiles("input[type=file]", {
    name: "test-video.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake video data")
  });
  
  // Check if the file list contains "test-video.mp4"
  const text = await page.content();
  if (text.includes("test-video.mp4")) {
    console.log("SUCCESS: File showed up in the UI!");
  } else {
    console.log("FAILED: File did NOT show up in the UI!");
    // Dump console
  }
  
  await browser.close();
})();
