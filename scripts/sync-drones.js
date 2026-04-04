const DriveClient = require('../lib/drive-client');
const { parseArtistName, sanitizeFilename, parseMonthFolder } = require('../lib/filename-parser');
const { convertToMp3, checkFfmpegAvailable } = require('../lib/audio-converter');
const SpacesClient = require('../lib/spaces-client');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
require('dotenv').config({ path: '.env.local' });

async function syncDroneOrchestra() {
  console.log('🎵 Drone Orchestra Sync Starting...\n');

  // 1. Verify FFmpeg is available
  console.log('Checking FFmpeg availability...');
  const ffmpegAvailable = await checkFfmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg not found. Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)');
  }
  console.log('✓ FFmpeg available\n');

  // 2. Initialize clients
  console.log('Initializing API clients...');
  const driveClient = new DriveClient(
    process.env.GOOGLE_DRIVE_API_KEY,
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );

  const spacesClient = new SpacesClient({
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
    region: process.env.DO_SPACES_REGION,
    bucket: process.env.DO_SPACES_BUCKET,
    endpoint: process.env.DO_SPACES_ENDPOINT,
    cdnEndpoint: process.env.DO_SPACES_CDN_ENDPOINT
  });
  console.log('✓ Clients initialized\n');

  // 3. Fetch month folders from Drive
  console.log('Fetching month folders from Google Drive...');
  const folders = await driveClient.listMonthFolders();
  console.log(`✓ Found ${folders.length} folders\n`);

  // 4. Process each month folder
  const months = [];

  for (const folder of folders) {
    const monthData = parseMonthFolder(folder.name);

    if (!monthData) {
      console.log(`⚠ Skipping invalid folder name: ${folder.name}`);
      continue;
    }

    console.log(`Processing ${monthData.name}${monthData.theme ? ' - ' + monthData.theme : ''}...`);

    // Fetch audio files in this folder
    const audioFiles = await driveClient.listAudioFiles(folder.id);
    console.log(`  Found ${audioFiles.length} audio files`);

    if (audioFiles.length === 0) {
      // Include month with 0 drones
      months.push({
        id: monthData.id,
        name: monthData.name,
        theme: monthData.theme,
        droneCount: 0,
        drones: []
      });
      continue;
    }

    // Limit to 50 files for performance
    const filesToProcess = audioFiles.slice(0, 50);
    if (audioFiles.length > 50) {
      console.log(`  ⚠ Limiting to first 50 files (found ${audioFiles.length})`);
    }

    const drones = [];

    for (const file of filesToProcess) {
      try {
        console.log(`  Processing: ${file.name}`);

        // Parse artist name
        const artistName = parseArtistName(file.name);

        // Sanitize filename for CDN
        const sanitized = sanitizeFilename(file.name);
        const mp3Filename = sanitized.replace(/\.[^.]+$/, '.mp3');

        // Create temp directory for download
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drone-'));
        const tempInputPath = path.join(tempDir, file.name);
        const tempOutputPath = path.join(tempDir, mp3Filename);

        try {
          // Download from Drive
          console.log(`    Downloading...`);
          const fileBuffer = await driveClient.downloadFile(file.id);
          await fs.writeFile(tempInputPath, fileBuffer);

          // Convert to MP3
          console.log(`    Converting to MP3...`);
          await convertToMp3(tempInputPath, tempOutputPath);

          // Upload to DO Spaces
          console.log(`    Uploading to CDN...`);
          const remotePath = `drone-orchestra/${monthData.id}/${mp3Filename}`;
          const cdnUrl = await spacesClient.uploadFile(tempOutputPath, remotePath);

          // Add to drones array
          drones.push({
            artist: artistName,
            url: cdnUrl,
            originalFilename: file.name
          });

          console.log(`    ✓ ${artistName} - ${cdnUrl}`);
        } finally {
          // Clean up temp files
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.error(`    ✗ Failed to process ${file.name}: ${error.message}`);
        // Continue with other files
      }
    }

    // Add month to collection
    months.push({
      id: monthData.id,
      name: monthData.name,
      theme: monthData.theme,
      droneCount: drones.length,
      drones
    });

    console.log(`✓ Processed ${monthData.name}: ${drones.length} drones\n`);
  }

  // 5. Generate months.json
  console.log('Generating months.json...');
  const outputData = {
    generated: new Date().toISOString(),
    months: months.sort((a, b) => b.id.localeCompare(a.id)) // Sort newest first
  };

  const outputPath = path.join(__dirname, '..', 'public', 'data', 'months.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));

  console.log(`✓ Generated ${outputPath}`);
  console.log(`\n🎉 Sync complete! Processed ${months.length} months with ${months.reduce((sum, m) => sum + m.droneCount, 0)} total drones.`);
}

// Run sync
if (require.main === module) {
  syncDroneOrchestra()
    .catch(error => {
      console.error('\n❌ Sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = syncDroneOrchestra;
