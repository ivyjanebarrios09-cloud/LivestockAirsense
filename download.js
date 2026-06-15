import fs from 'node:fs';
import https from 'node:https';

const url = "https://fzugmubaqmfjuxdvfnur.supabase.co/storage/v1/object/public/products/1000005269-removebg-preview.png";

https.get(url, (res) => {
  const writeStream = fs.createWriteStream('public/logo.png');
  res.pipe(writeStream);
  writeStream.on('finish', () => {
    writeStream.close();
    console.log('Download Completed');
  });
}).on('error', (err) => {
  console.log('Error: ', err.message);
});
