const fs = require('fs');
const axios = require('axios');
const unzipper = require('unzipper');
const path = require('path');

async function downloadAndExtractZip(zipUrl, outputDir) {
  console.log('Starting download and extraction...');

  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Output directory created: ${outputDir}`);
  }

  // Step 1: Download the ZIP file
  const response = await axios({
    method: 'GET',
    url: zipUrl,
    responseType: 'stream'
  });

  // Step 2: Create a write stream to a temporary file
  const tempZipPath = path.join(outputDir, 'temp.zip');
  const writer = fs.createWriteStream(tempZipPath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log('File downloaded. Starting extraction...');

      // Step 3: Extract the ZIP file
      fs.createReadStream(tempZipPath)
        .pipe(unzipper.Extract({ path: outputDir }))
        .on('close', () => {
          console.log('Extraction complete.');
          // Optionally delete the temp ZIP file after extraction
          fs.unlink(tempZipPath, () => {
            console.log('Temporary ZIP file removed.');
            resolve();
          });
        })
        .on('error', (err) => {
          reject(err);
        });
    });

    writer.on('error', reject);
  });
}

// Usage: Update the ZIP URL and specify an output directory
const zipUrl = 'https://cdn.glitch.me/c58d7140-0f18-4198-9f3d-8dfdbda0c03f/Archive.zip?v=1712960858550';
const outputDir = path.join(__dirname, 'extracted'); // Change this to your desired path

downloadAndExtractZip(zipUrl, outputDir)
  .then(() => console.log('All done!'))
  .catch(err => console.error('An error occurred:', err));
