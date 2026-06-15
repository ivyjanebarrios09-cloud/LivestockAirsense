import fs from 'node:fs';

const url = "https://fzugmubaqmfjuxdvfnur.supabase.co/storage/v1/object/public/products/1000005269-removebg-preview%20(1).png";

async function downloadLogo() {
  try {
    console.log(`Downloading from ${url}...`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch logo: ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    fs.writeFileSync('public/logo.png', Buffer.from(buffer));
    console.log('Download Completed Successfully! File size:', buffer.byteLength);
  } catch (error) {
    console.error('Error during download:', error);
    process.exit(1);
  }
}

downloadLogo();
