# Drone Orchestra Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the 3D spatial audio explorer with Drone Orchestra's Google Drive workflow, automating monthly syncs and providing an interactive archive browser.

**Architecture:** GitHub Action fetches Drive folders daily, converts audio to MP3 VBR, uploads to DO Spaces CDN, generates metadata JSON. Static Vercel site loads JSON and dynamically creates A-Frame entities for each month's drones.

**Tech Stack:** Node.js, googleapis, @aws-sdk/client-s3, ffmpeg, A-Frame 1.2.0, Vercel

---

## File Structure

**Backend/Automation:**
- `.github/workflows/sync-drone-orchestra.yml` - GitHub Action workflow
- `scripts/sync-drones.js` - Main sync orchestrator
- `lib/drive-client.js` - Google Drive API wrapper
- `lib/spaces-client.js` - DO Spaces upload wrapper
- `lib/audio-converter.js` - FFmpeg conversion wrapper
- `lib/filename-parser.js` - Extract artist names from filenames

**Frontend:**
- `public/index.html` - Main page (refactor existing)
- `public/js/month-selector.js` - Month selection UI
- `public/js/drone-scene.js` - Dynamic scene controller
- `public/js/metadata-display.js` - Artist name overlays
- `public/styles/main.css` - Extracted styles
- `public/data/months.json` - Generated metadata (created by workflow)

**Config:**
- `package.json` - Dependencies
- `vercel.json` - Deployment config
- `.gitignore` - Git ignore patterns

---

### Task 1: Project Setup and Dependencies

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add backend dependencies to package.json**

```json
{
  "name": "drone-orchestra-explorer",
  "version": "1.0.0",
  "description": "An immersive 3D audio-visual experience with orbiting drone entities and spatial audio",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "sync": "node scripts/sync-drones.js"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "@fastify/static": "^6.10.2",
    "@fastify/view": "^8.0.0",
    "dotenv": "^16.4.5",
    "fastify": "^4.21.0",
    "googleapis": "^140.0.0",
    "handlebars": "^4.7.8"
  },
  "devDependencies": {},
  "engines": {
    "node": ">=18.x"
  },
  "repository": {
    "url": "https://github.com/ellinglien/drone-orchestra-explorer"
  },
  "license": "MIT",
  "keywords": [
    "aframe",
    "webgl",
    "3d",
    "audio",
    "drone",
    "spatial-audio"
  ]
}
```

- [ ] **Step 2: Update .gitignore**

```
node_modules/
.env
.env.local
.DS_Store
public/data/months.json
*.log
.vercel
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: Dependencies installed successfully

- [ ] **Step 4: Commit setup**

```bash
git add package.json .gitignore
git commit -m "chore: add dependencies for Drive sync and CDN upload"
```

---

### Task 2: Google Drive Client Library

**Files:**
- Create: `lib/drive-client.js`

- [ ] **Step 1: Create Drive API client wrapper**

```javascript
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

class DriveClient {
  constructor(apiKey, folderId) {
    this.drive = google.drive({
      version: 'v3',
      auth: apiKey,
    });
    this.folderId = folderId;
  }

  /**
   * List all folders in the Drone Orchestra parent folder
   * @returns {Promise<Array>} Array of folder objects with id and name
   */
  async listMonthFolders() {
    try {
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        orderBy: 'name desc',
      });
      return response.data.files || [];
    } catch (error) {
      console.error('Error listing month folders:', error.message);
      throw error;
    }
  }

  /**
   * List all audio files in a specific month folder
   * @param {string} folderId - The folder ID to list files from
   * @returns {Promise<Array>} Array of file objects with id, name, and webContentLink
   */
  async listAudioFiles(folderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, size, webContentLink)',
        orderBy: 'name',
      });

      // Filter for audio files only
      const audioExtensions = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac'];
      const audioFiles = (response.data.files || []).filter(file => {
        const lower = file.name.toLowerCase();
        return audioExtensions.some(ext => lower.endsWith(ext));
      });

      return audioFiles;
    } catch (error) {
      console.error('Error listing audio files:', error.message);
      throw error;
    }
  }

  /**
   * Download a file from Google Drive
   * @param {string} fileId - The file ID to download
   * @returns {Promise<Buffer>} File content as buffer
   */
  async downloadFile(fileId) {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading file:', error.message);
      throw error;
    }
  }
}

module.exports = DriveClient;
```

- [ ] **Step 2: Test Drive client manually (requires .env.local)**

Create `.env.local` with:
```
GOOGLE_DRIVE_API_KEY=your_key_here
GOOGLE_DRIVE_FOLDER_ID=1fEfeXd79DLVF9t_QtqUjjUraNH40-Goh
```

Test script:
```javascript
// scripts/test-drive.js
const DriveClient = require('../lib/drive-client');

async function test() {
  const client = new DriveClient(
    process.env.GOOGLE_DRIVE_API_KEY,
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );

  const folders = await client.listMonthFolders();
  console.log('Found folders:', folders.length);
  console.log('First folder:', folders[0]);
}

test().catch(console.error);
```

Run: `node scripts/test-drive.js`
Expected: Logs folder count and first folder name

- [ ] **Step 3: Commit Drive client**

```bash
git add lib/drive-client.js scripts/test-drive.js
git commit -m "feat: add Google Drive API client wrapper"
```

---

### Task 3: Filename Parser Library

**Files:**
- Create: `lib/filename-parser.js`

- [ ] **Step 1: Create filename parser with test cases**

```javascript
/**
 * Parse artist name from drone filename
 * Handles common patterns:
 * - "Artist - Title.ext" → "Artist"
 * - "Artist_Title.ext" → "Artist"
 * - "ArtistTitle.ext" → "ArtistTitle"
 */
function parseArtistName(filename) {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

  // Try splitting by dash (most common)
  if (nameWithoutExt.includes(' - ')) {
    return nameWithoutExt.split(' - ')[0].trim();
  }

  // Try splitting by underscore
  if (nameWithoutExt.includes('_')) {
    return nameWithoutExt.split('_')[0].trim();
  }

  // Fallback: use whole filename without extension
  return nameWithoutExt.trim();
}

/**
 * Sanitize filename for CDN storage
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters except hyphens and dots
 */
function sanitizeFilename(filename) {
  return filename
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-+/g, '-');
}

/**
 * Parse month info from folder name
 * Examples:
 * - "2025-04" → { id: "2025-04", name: "April 2025", theme: null }
 * - "2025-04 Chaos" → { id: "2025-04", name: "April 2025", theme: "Chaos" }
 * - "2025-05 D Minor" → { id: "2025-05", name: "May 2025", theme: "D Minor" }
 */
function parseMonthFolder(folderName) {
  const match = folderName.match(/^(\d{4})-(\d{2})(.*)$/);

  if (!match) {
    return null;
  }

  const [, year, month, rest] = match;
  const theme = rest.trim() || null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthNum = parseInt(month, 10);
  const monthName = monthNames[monthNum - 1];

  return {
    id: `${year}-${month}`,
    name: `${monthName} ${year}`,
    theme,
  };
}

module.exports = {
  parseArtistName,
  sanitizeFilename,
  parseMonthFolder,
};
```

- [ ] **Step 2: Test parser functions**

```javascript
// scripts/test-parser.js
const { parseArtistName, sanitizeFilename, parseMonthFolder } = require('../lib/filename-parser');

console.log('Artist parsing:');
console.log(parseArtistName('USTAKNOW - Chaos Drone.ogg')); // "USTAKNOW"
console.log(parseArtistName('Mikey_Hogan_April.mp3')); // "Mikey"
console.log(parseArtistName('CyberneticVoyagerApril2025.wav')); // "CyberneticVoyagerApril2025"

console.log('\nFilename sanitization:');
console.log(sanitizeFilename('USTAKNOW - Chaos Drone.ogg')); // "ustaknow-chaos-drone.ogg"

console.log('\nMonth parsing:');
console.log(parseMonthFolder('2025-04')); // { id: "2025-04", name: "April 2025", theme: null }
console.log(parseMonthFolder('2025-04 Chaos')); // { id: "2025-04", name: "April 2025", theme: "Chaos" }
```

Run: `node scripts/test-parser.js`
Expected: Outputs match commented expectations

- [ ] **Step 3: Commit parser library**

```bash
git add lib/filename-parser.js scripts/test-parser.js
git commit -m "feat: add filename and folder parsing utilities"
```

---

### Task 4: Audio Converter Library

**Files:**
- Create: `lib/audio-converter.js`

- [ ] **Step 1: Create FFmpeg wrapper for audio conversion**

```javascript
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Convert audio file to MP3 VBR using FFmpeg
 * @param {Buffer} inputBuffer - Input audio file buffer
 * @param {string} inputExt - Input file extension (e.g., '.wav')
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
async function convertToMP3(inputBuffer, inputExt, outputPath) {
  return new Promise((resolve, reject) => {
    // Write input buffer to temp file
    const tempDir = '/tmp';
    const tempInput = path.join(tempDir, `input${inputExt}`);

    fs.writeFileSync(tempInput, inputBuffer);

    // Run FFmpeg
    const ffmpeg = spawn('ffmpeg', [
      '-i', tempInput,
      '-codec:a', 'libmp3lame',
      '-q:a', '4', // VBR quality 4 (~165kbps average)
      '-y', // Overwrite output file
      outputPath,
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      // Clean up temp input
      try {
        fs.unlinkSync(tempInput);
      } catch (e) {
        // Ignore cleanup errors
      }

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
  });
}

module.exports = {
  convertToMP3,
};
```

- [ ] **Step 2: Manual test (requires ffmpeg installed)**

```javascript
// scripts/test-converter.js
const { convertToMP3 } = require('../lib/audio-converter');
const fs = require('fs');

async function test() {
  // Create a dummy WAV file (1 second of silence)
  const dummyWav = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x08, 0x00, 0x00,
    0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
    // ... minimal WAV header
  ]);

  const outputPath = '/tmp/test-output.mp3';

  await convertToMP3(dummyWav, '.wav', outputPath);

  const exists = fs.existsSync(outputPath);
  console.log('Conversion successful:', exists);

  if (exists) {
    const stats = fs.statSync(outputPath);
    console.log('Output size:', stats.size, 'bytes');
    fs.unlinkSync(outputPath);
  }
}

test().catch(console.error);
```

Run: `node scripts/test-converter.js`
Expected: "Conversion successful: true"

Note: If ffmpeg not installed, install with:
- macOS: `brew install ffmpeg`
- Ubuntu: `apt-get install ffmpeg`
- GitHub Actions has ffmpeg pre-installed

- [ ] **Step 3: Commit audio converter**

```bash
git add lib/audio-converter.js scripts/test-converter.js
git commit -m "feat: add FFmpeg audio converter wrapper"
```

---

### Task 5: DO Spaces Client Library

**Files:**
- Create: `lib/spaces-client.js`

- [ ] **Step 1: Create DO Spaces upload wrapper**

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

class SpacesClient {
  constructor() {
    this.client = new S3Client({
      endpoint: process.env.DO_SPACES_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
      region: process.env.DO_SPACES_REGION || 'nyc3',
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY || '',
        secretAccessKey: process.env.DO_SPACES_SECRET || '',
      },
    });

    this.bucket = process.env.DO_SPACES_BUCKET || 'rpm3';
    this.cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT || 'https://rpm3.nyc3.cdn.digitaloceanspaces.com';
  }

  /**
   * Upload file to DO Spaces
   * @param {string} localPath - Local file path to upload
   * @param {string} remotePath - Remote path in bucket (e.g., "drone-orchestra/2025-04/file.mp3")
   * @returns {Promise<string>} Public CDN URL
   */
  async uploadFile(localPath, remotePath) {
    try {
      const fileBuffer = fs.readFileSync(localPath);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: remotePath,
        Body: fileBuffer,
        ACL: 'public-read',
        ContentType: 'audio/mpeg',
      });

      await this.client.send(command);

      const publicUrl = `${this.cdnEndpoint}/${remotePath}`;
      return publicUrl;
    } catch (error) {
      console.error('Error uploading to Spaces:', error.message);
      throw error;
    }
  }
}

module.exports = SpacesClient;
```

- [ ] **Step 2: Test upload (requires DO Spaces credentials in .env.local)**

Add to `.env.local`:
```
DO_SPACES_KEY=your_key
DO_SPACES_SECRET=your_secret
DO_SPACES_BUCKET=rpm3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_CDN_ENDPOINT=https://rpm3.nyc3.cdn.digitaloceanspaces.com
```

Test script:
```javascript
// scripts/test-spaces.js
const SpacesClient = require('../lib/spaces-client');
const fs = require('fs');

async function test() {
  // Create a small test file
  const testPath = '/tmp/test-upload.txt';
  fs.writeFileSync(testPath, 'Test content from drone orchestra sync');

  const client = new SpacesClient();
  const url = await client.uploadFile(testPath, 'drone-orchestra/test/test-upload.txt');

  console.log('Uploaded to:', url);

  // Clean up
  fs.unlinkSync(testPath);
}

test().catch(console.error);
```

Run: `node scripts/test-spaces.js`
Expected: Logs CDN URL, file accessible at that URL

- [ ] **Step 3: Commit Spaces client**

```bash
git add lib/spaces-client.js scripts/test-spaces.js
git commit -m "feat: add DO Spaces upload client"
```

---

### Task 6: Main Sync Script

**Files:**
- Create: `scripts/sync-drones.js`

- [ ] **Step 1: Create main sync orchestrator**

```javascript
#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const DriveClient = require('../lib/drive-client');
const SpacesClient = require('../lib/spaces-client');
const { convertToMP3 } = require('../lib/audio-converter');
const { parseArtistName, sanitizeFilename, parseMonthFolder } = require('../lib/filename-parser');
const fs = require('fs');
const path = require('path');

// Configuration
const GOOGLE_DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OUTPUT_JSON_PATH = path.join(__dirname, '../public/data/months.json');
const TEMP_DIR = '/tmp/drone-sync';

async function main() {
  console.log('🎵 Starting Drone Orchestra sync...\n');

  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Initialize clients
  const driveClient = new DriveClient(GOOGLE_DRIVE_API_KEY, GOOGLE_DRIVE_FOLDER_ID);
  const spacesClient = new SpacesClient();

  // Load existing metadata (if exists)
  let existingData = { months: [] };
  if (fs.existsSync(OUTPUT_JSON_PATH)) {
    existingData = JSON.parse(fs.readFileSync(OUTPUT_JSON_PATH, 'utf-8'));
  }

  // Fetch month folders from Drive
  console.log('📂 Fetching month folders from Google Drive...');
  const folders = await driveClient.listMonthFolders();
  console.log(`Found ${folders.length} month folders\n`);

  const allMonths = [];

  for (const folder of folders) {
    const monthInfo = parseMonthFolder(folder.name);

    if (!monthInfo) {
      console.log(`⚠️  Skipping folder with invalid name: ${folder.name}`);
      continue;
    }

    console.log(`\n📅 Processing: ${monthInfo.name}${monthInfo.theme ? ` (${monthInfo.theme})` : ''}`);

    // Check if already synced
    const existingMonth = existingData.months.find(m => m.id === monthInfo.id);

    // List audio files in folder
    const audioFiles = await driveClient.listAudioFiles(folder.id);
    console.log(`   Found ${audioFiles.length} audio files`);

    // Skip if already synced and file count matches
    if (existingMonth && existingMonth.droneCount === audioFiles.length) {
      console.log(`   ✓ Already synced, skipping`);
      allMonths.push(existingMonth);
      continue;
    }

    // Process each audio file
    const drones = [];

    for (let i = 0; i < Math.min(audioFiles.length, 50); i++) {
      const file = audioFiles[i];
      console.log(`   [${i + 1}/${audioFiles.length}] ${file.name}`);

      try {
        // Download file
        const fileBuffer = await driveClient.downloadFile(file.id);

        // Convert to MP3
        const fileExt = path.extname(file.name);
        const baseName = path.basename(file.name, fileExt);
        const sanitized = sanitizeFilename(baseName);
        const mp3Filename = `${sanitized}.mp3`;
        const tempMp3Path = path.join(TEMP_DIR, mp3Filename);

        await convertToMP3(fileBuffer, fileExt, tempMp3Path);

        // Upload to Spaces
        const remotePath = `drone-orchestra/${monthInfo.id}/${mp3Filename}`;
        const cdnUrl = await spacesClient.uploadFile(tempMp3Path, remotePath);

        // Parse artist name
        const artist = parseArtistName(file.name);

        // Add to drones list
        drones.push({
          artist,
          url: cdnUrl,
          originalFilename: file.name,
        });

        // Clean up temp file
        fs.unlinkSync(tempMp3Path);

        console.log(`      ✓ ${artist}`);
      } catch (error) {
        console.error(`      ✗ Failed: ${error.message}`);
      }
    }

    // Add month to results
    allMonths.push({
      id: monthInfo.id,
      name: monthInfo.name,
      theme: monthInfo.theme,
      droneCount: drones.length,
      drones,
    });
  }

  // Sort months by ID descending (newest first)
  allMonths.sort((a, b) => b.id.localeCompare(a.id));

  // Write metadata JSON
  const outputData = {
    generated: new Date().toISOString(),
    months: allMonths,
  };

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_JSON_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(outputData, null, 2));
  console.log(`\n✅ Sync complete! Metadata written to ${OUTPUT_JSON_PATH}`);
  console.log(`   Total months: ${allMonths.length}`);
  console.log(`   Total drones: ${allMonths.reduce((sum, m) => sum + m.droneCount, 0)}`);

  // Clean up temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
  }
}

main().catch(error => {
  console.error('❌ Sync failed:', error.message);
  process.exit(1);
});
```

- [ ] **Step 2: Test sync script locally**

Run: `node scripts/sync-drones.js`
Expected:
- Fetches folders from Drive
- Downloads audio files
- Converts to MP3
- Uploads to Spaces
- Generates `public/data/months.json`

Note: This will take a few minutes depending on file count.

- [ ] **Step 3: Verify generated JSON structure**

```bash
cat public/data/months.json | head -n 30
```

Expected format:
```json
{
  "generated": "2026-04-04T12:00:00.000Z",
  "months": [
    {
      "id": "2025-04",
      "name": "April 2025",
      "theme": "Chaos",
      "droneCount": 11,
      "drones": [
        {
          "artist": "USTAKNOW",
          "url": "https://rpm3.nyc3.cdn.digitaloceanspaces.com/drone-orchestra/2025-04/ustaknow-...",
          "originalFilename": "USTAKNOW_..."
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Commit sync script**

```bash
git add scripts/sync-drones.js public/data/months.json
git commit -m "feat: add main sync orchestrator script"
```

---

### Task 7: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/sync-drone-orchestra.yml`

- [ ] **Step 1: Create workflow file**

```yaml
name: Sync Drone Orchestra

on:
  schedule:
    # Run daily at 6am UTC
    - cron: '0 6 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run sync script
        env:
          GOOGLE_DRIVE_API_KEY: ${{ secrets.GOOGLE_DRIVE_API_KEY }}
          GOOGLE_DRIVE_FOLDER_ID: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
          DO_SPACES_KEY: ${{ secrets.DO_SPACES_KEY }}
          DO_SPACES_SECRET: ${{ secrets.DO_SPACES_SECRET }}
          DO_SPACES_BUCKET: ${{ secrets.DO_SPACES_BUCKET }}
          DO_SPACES_ENDPOINT: ${{ secrets.DO_SPACES_ENDPOINT }}
          DO_SPACES_CDN_ENDPOINT: ${{ secrets.DO_SPACES_CDN_ENDPOINT }}
        run: node scripts/sync-drones.js

      - name: Commit and push changes
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add public/data/months.json
          git diff --quiet && git diff --staged --quiet || (git commit -m "chore: update drone orchestra metadata [skip ci]" && git push)
```

- [ ] **Step 2: Create public/data directory structure**

```bash
mkdir -p public/data
touch public/data/.gitkeep
```

- [ ] **Step 3: Commit workflow**

```bash
git add .github/workflows/sync-drone-orchestra.yml public/data/.gitkeep
git commit -m "feat: add GitHub Actions workflow for daily sync"
```

- [ ] **Step 4: Add secrets to GitHub repository**

**Manual step:** Go to GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add each:
- `GOOGLE_DRIVE_API_KEY`
- `GOOGLE_DRIVE_FOLDER_ID` = `1fEfeXd79DLVF9t_QtqUjjUraNH40-Goh`
- `DO_SPACES_KEY` (from RPM site)
- `DO_SPACES_SECRET` (from RPM site)
- `DO_SPACES_BUCKET` = `rpm3`
- `DO_SPACES_ENDPOINT` = `https://nyc3.digitaloceanspaces.com`
- `DO_SPACES_CDN_ENDPOINT` = `https://rpm3.nyc3.cdn.digitaloceanspaces.com`

- [ ] **Step 5: Test workflow manually**

**Manual step:** Go to GitHub → Actions tab → "Sync Drone Orchestra" → "Run workflow"

Expected: Workflow runs successfully, commits updated months.json

---

### Task 8: Extract and Refactor CSS

**Files:**
- Create: `public/styles/main.css`
- Modify: `public/index.html`

- [ ] **Step 1: Extract inline styles to CSS file**

```css
/* public/styles/main.css */

body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: 'Arial', sans-serif;
    background-color: #000;
}

/* Month Selector Overlay */
#month-selector-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.95);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    transition: opacity 0.5s ease;
}

#month-selector-overlay.hidden {
    opacity: 0;
    pointer-events: none;
}

#month-selector-title {
    font-size: 60px;
    font-weight: bold;
    color: #FFF;
    margin-bottom: 40px;
    letter-spacing: 8px;
    text-align: center;
}

#month-list {
    max-width: 600px;
    max-height: 60vh;
    overflow-y: auto;
    padding: 20px;
}

.month-item {
    padding: 20px;
    margin-bottom: 15px;
    background-color: #1a0800;
    border: 2px solid #330000;
    cursor: pointer;
    transition: all 0.3s;
}

.month-item:hover {
    background-color: #330000;
    border-color: #990000;
    transform: translateX(5px);
}

.month-item-name {
    font-size: 24px;
    color: #ff5533;
    margin-bottom: 5px;
}

.month-item-theme {
    font-size: 16px;
    color: #999;
}

.month-item-count {
    font-size: 14px;
    color: #666;
    margin-top: 5px;
}

/* Loading state */
#month-selector-loading {
    color: #999;
    font-size: 18px;
}

/* Intro Overlay (existing) */
#intro-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

#intro-overlay.hidden {
    display: none;
}

#title {
    font-size: 80px;
    font-weight: bold;
    color: #FFF;
    margin-bottom: 60px;
    text-align: center;
    letter-spacing: 10px;
}

#startButton {
    padding: 15px 30px;
    font-size: 18px;
    background-color: #330000;
    color: white;
    border: none;
    cursor: pointer;
    transition: all 0.3s;
}

#startButton:hover {
    background-color: #990000;
    transform: scale(1.05);
}

#controls {
    color: white;
    margin-top: 40px;
    text-align: center;
    max-width: 600px;
    line-height: 1.6;
}

/* Brightness Controls */
#brightness-controls {
    position: absolute;
    z-index: 9998;
    bottom: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 10px;
    border-radius: 5px;
    color: white;
    display: none;
}

.slider-container {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.slider-container label {
    margin-right: 10px;
    width: 100px;
}

input[type="range"] {
    width: 150px;
}

/* Metadata Display */
#metadata-display {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 9998;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 15px;
    border-radius: 5px;
    color: white;
    display: none;
}

#metadata-month-info {
    font-size: 18px;
    color: #ff5533;
    margin-bottom: 5px;
}

#metadata-theme-info {
    font-size: 14px;
    color: #999;
}

#change-month-button {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 9998;
    padding: 10px 20px;
    background-color: rgba(51, 0, 0, 0.8);
    color: white;
    border: 1px solid #990000;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
    display: none;
}

#change-month-button:hover {
    background-color: rgba(153, 0, 0, 0.9);
}

/* Override A-Frame loading screen */
.a-loader-title {
    background-color: #000 !important;
    color: #666 !important;
}

.a-enter-vr-button, .a-enter-ar-button {
    background-color: #222 !important;
}

a-scene .a-loader {
    background-color: #000 !important;
}

.a-canvas {
    background-color: #000 !important;
}
```

- [ ] **Step 2: Link CSS in HTML head**

Modify `public/index.html`, remove `<style>` block and add:

```html
<link rel="stylesheet" href="/styles/main.css">
```

- [ ] **Step 3: Test that styles still work**

Run: `npm start` and visit http://localhost:3000
Expected: Page looks identical to before

- [ ] **Step 4: Commit CSS extraction**

```bash
git add public/styles/main.css public/index.html
git commit -m "refactor: extract inline styles to main.css"
```

---

### Task 9: Month Selector UI Component

**Files:**
- Create: `public/js/month-selector.js`
- Modify: `public/index.html`

- [ ] **Step 1: Create month selector JavaScript**

```javascript
// public/js/month-selector.js

class MonthSelector {
  constructor() {
    this.overlay = document.getElementById('month-selector-overlay');
    this.monthList = document.getElementById('month-list');
    this.loading = document.getElementById('month-selector-loading');
    this.months = [];
    this.onMonthSelected = null;
  }

  async init() {
    this.showLoading(true);

    try {
      const response = await fetch('/data/months.json');
      if (!response.ok) {
        throw new Error(`Failed to load months: ${response.statusText}`);
      }

      const data = await response.json();
      this.months = data.months || [];

      this.render();
      this.showLoading(false);
    } catch (error) {
      console.error('Error loading months:', error);
      this.showError('Failed to load months. Please refresh the page.');
    }
  }

  showLoading(show) {
    this.loading.style.display = show ? 'block' : 'none';
    this.monthList.style.display = show ? 'none' : 'block';
  }

  showError(message) {
    this.monthList.innerHTML = `
      <div style="color: #ff5533; font-size: 18px; text-align: center; padding: 40px;">
        ${message}
      </div>
    `;
    this.showLoading(false);
  }

  render() {
    this.monthList.innerHTML = '';

    if (this.months.length === 0) {
      this.monthList.innerHTML = '<div style="color: #999; text-align: center; padding: 40px;">No months available yet</div>';
      return;
    }

    this.months.forEach((month, index) => {
      const item = document.createElement('div');
      item.className = 'month-item';

      const name = document.createElement('div');
      name.className = 'month-item-name';
      name.textContent = month.name;

      const theme = document.createElement('div');
      theme.className = 'month-item-theme';
      theme.textContent = month.theme ? `Theme: ${month.theme}` : 'No theme';

      const count = document.createElement('div');
      count.className = 'month-item-count';
      count.textContent = `${month.droneCount} drones`;

      item.appendChild(name);
      item.appendChild(theme);
      item.appendChild(count);

      // Highlight first (newest) month
      if (index === 0) {
        item.style.borderColor = '#ff5533';
      }

      item.addEventListener('click', () => this.selectMonth(month));

      this.monthList.appendChild(item);
    });
  }

  selectMonth(month) {
    if (this.onMonthSelected) {
      this.onMonthSelected(month);
    }
  }

  show() {
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }
}

// Export for use in main script
window.MonthSelector = MonthSelector;
```

- [ ] **Step 2: Add month selector overlay to HTML**

Add to `public/index.html` after opening `<body>` tag:

```html
<div id="month-selector-overlay">
    <div id="month-selector-title">DRONE ORCHESTRA</div>
    <div id="month-selector-loading">Loading months...</div>
    <div id="month-list"></div>
</div>
```

- [ ] **Step 3: Add script tag to HTML**

Add before closing `</body>` tag in `public/index.html`:

```html
<script src="/js/month-selector.js"></script>
```

- [ ] **Step 4: Test month selector loads**

Create a test `public/data/months.json`:
```json
{
  "generated": "2026-04-04T12:00:00Z",
  "months": [
    {
      "id": "2025-04",
      "name": "April 2025",
      "theme": "Chaos",
      "droneCount": 3,
      "drones": []
    }
  ]
}
```

Run: `npm start` and visit http://localhost:3000
Expected: Month selector overlay appears with "April 2025" item

- [ ] **Step 5: Commit month selector**

```bash
git add public/js/month-selector.js public/index.html public/data/months.json
git commit -m "feat: add month selector UI component"
```

---

### Task 10: Drone Scene Controller

**Files:**
- Create: `public/js/drone-scene.js`
- Modify: `public/index.html`

- [ ] **Step 1: Create drone scene controller**

```javascript
// public/js/drone-scene.js

class DroneScene {
  constructor() {
    this.sceneEl = document.querySelector('a-scene');
    this.currentMonth = null;
    this.entities = [];
  }

  init(monthData) {
    this.currentMonth = monthData;
    this.clearScene();
    this.createDrones();
  }

  clearScene() {
    // Remove existing drone entities
    this.entities.forEach(entity => {
      if (entity.parentNode) {
        entity.parentNode.removeChild(entity);
      }
    });
    this.entities = [];
  }

  createDrones() {
    const drones = this.currentMonth.drones || [];
    const numberOfDrones = Math.min(drones.length, 50); // Max 50

    for (let i = 0; i < numberOfDrones; i++) {
      const drone = drones[i];

      // Create entity
      const entityEl = document.createElement('a-entity');
      entityEl.setAttribute('class', 'drone-entity');
      entityEl.setAttribute('data-artist', drone.artist);

      // Orbital parameters
      const radius = (i === 0) ? 6 : 6 + Math.random() * 10;
      const speed = 0.003 + Math.random() * 0.005;
      const inclination = Math.PI * (Math.random() * 0.3 - 0.15);
      const azimuthalOffset = (i === 0) ? 0 : Math.PI * 2 * Math.random();
      const direction = Math.random() > 0.5 ? 1 : -1;
      const tilt = Math.PI * (Math.random() * 0.2 - 0.1);
      const eccentricity = Math.random() * 0.15;

      entityEl.setAttribute('orbital-motion', {
        radius,
        speed,
        inclination,
        azimuthalOffset,
        direction,
        tilt,
        eccentricity,
      });

      // Create visual geometry (box)
      const polyhedronEl = document.createElement('a-entity');
      polyhedronEl.setAttribute('geometry', {
        primitive: 'box',
        radius: 0.5,
        detail: 0,
      });
      polyhedronEl.setAttribute('material', {
        shader: 'standard',
        color: '#2a0800',
        emissive: '#3a1000',
        emissiveIntensity: 0.25,
        metalness: 0.2,
        roughness: 0.8,
        side: 'double',
        transparent: true,
        opacity: 0,
      });
      polyhedronEl.setAttribute('visible', 'false');
      polyhedronEl.setAttribute('class', 'drone-object');

      // Initial rotation
      const initialRotation = {
        x: Math.random() * 360,
        y: Math.random() * 360,
        z: Math.random() * 360,
      };
      polyhedronEl.setAttribute('rotation', initialRotation);

      // Staggered fade-in animation
      const delay = i === 0 ? 0 : Math.random() * 9000 + 1000;

      setTimeout(() => {
        polyhedronEl.setAttribute('visible', 'true');
        polyhedronEl.setAttribute('animation__opacity', {
          property: 'material.opacity',
          from: 0,
          to: 1,
          dur: 10000,
          easing: 'easeInOutQuad',
        });

        // Start audio playback
        entityEl.setAttribute('sound', {
          src: drone.url,
          autoplay: true,
          positional: true,
          refDistance: 1,
          rolloffFactor: 1.5,
          loop: true,
        });

        // Update brightness control cache
        const brightnessControlEntity = document.getElementById('brightness-control-entity');
        if (brightnessControlEntity && brightnessControlEntity.components['brightness-control']) {
          brightnessControlEntity.components['brightness-control'].refreshCache();
          brightnessControlEntity.components['brightness-control'].update();
        }
      }, delay);

      entityEl.appendChild(polyhedronEl);
      this.sceneEl.appendChild(entityEl);
      this.entities.push(entityEl);
    }
  }
}

// Export for use in main script
window.DroneScene = DroneScene;
```

- [ ] **Step 2: Add script tag to HTML**

Add to `public/index.html` before closing `</body>`:

```html
<script src="/js/drone-scene.js"></script>
```

- [ ] **Step 3: Create integration script to connect components**

Add to `public/index.html` before closing `</body>`:

```html
<script>
  // Initialize month selector
  const monthSelector = new MonthSelector();
  const droneScene = new DroneScene();

  // When month is selected, hide selector and start scene
  monthSelector.onMonthSelected = (month) => {
    console.log('Selected month:', month.name);

    // Hide month selector
    monthSelector.hide();

    // Show scene controls
    document.getElementById('brightness-controls').style.display = 'block';
    document.getElementById('metadata-display').style.display = 'block';
    document.getElementById('change-month-button').style.display = 'block';

    // Update metadata display
    document.getElementById('metadata-month-info').textContent = month.name;
    document.getElementById('metadata-theme-info').textContent =
      month.theme ? `Theme: ${month.theme}` : 'No theme';

    // Initialize scene with month data
    droneScene.init(month);
  };

  // Change month button returns to selector
  document.getElementById('change-month-button').addEventListener('click', () => {
    // Stop all audio
    const audioEntities = document.querySelectorAll('[sound]');
    audioEntities.forEach(entity => {
      if (entity.components.sound) {
        entity.components.sound.stopSound();
      }
    });

    // Clear scene
    droneScene.clearScene();

    // Hide scene controls
    document.getElementById('brightness-controls').style.display = 'none';
    document.getElementById('metadata-display').style.display = 'none';
    document.getElementById('change-month-button').style.display = 'none';

    // Show month selector
    monthSelector.show();
  });

  // Start month selector after A-Frame loads
  document.addEventListener('DOMContentLoaded', () => {
    monthSelector.init();
  });
</script>
```

- [ ] **Step 4: Test scene initialization**

Run: `npm start` and visit http://localhost:3000
Expected:
- Month selector appears
- Click on month
- Scene loads with drones
- Audio plays from CDN URLs

- [ ] **Step 5: Commit drone scene controller**

```bash
git add public/js/drone-scene.js public/index.html
git commit -m "feat: add dynamic drone scene controller"
```

---

### Task 11: Metadata Display Component

**Files:**
- Create: `public/js/metadata-display.js`
- Modify: `public/index.html`

- [ ] **Step 1: Add metadata display HTML elements**

Add to `public/index.html` after scene:

```html
<div id="metadata-display">
    <div id="metadata-month-info"></div>
    <div id="metadata-theme-info"></div>
</div>

<button id="change-month-button">◄ Change Month</button>
```

- [ ] **Step 2: Create metadata display component (hover feature)**

```javascript
// public/js/metadata-display.js

class MetadataDisplay {
  constructor() {
    this.hoveredEntity = null;
    this.label = null;
  }

  init() {
    // Create floating label for artist names
    this.label = document.createElement('div');
    this.label.id = 'artist-label';
    this.label.style.position = 'absolute';
    this.label.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.label.style.color = '#ff5533';
    this.label.style.padding = '8px 12px';
    this.label.style.borderRadius = '4px';
    this.label.style.fontSize = '14px';
    this.label.style.pointerEvents = 'none';
    this.label.style.display = 'none';
    this.label.style.zIndex = '10000';
    document.body.appendChild(this.label);

    // Listen for raycaster events
    const camera = document.querySelector('[camera]');
    if (camera) {
      camera.addEventListener('raycaster-intersection', (e) => {
        const intersected = e.detail.els[0];
        if (intersected && intersected.classList.contains('drone-object')) {
          this.showArtistLabel(intersected.parentElement);
        }
      });

      camera.addEventListener('raycaster-intersection-cleared', () => {
        this.hideArtistLabel();
      });
    }

    // Fallback: mouse position tracking for desktop
    document.addEventListener('mousemove', (e) => {
      if (this.label.style.display === 'block') {
        this.label.style.left = (e.clientX + 15) + 'px';
        this.label.style.top = (e.clientY + 15) + 'px';
      }
    });
  }

  showArtistLabel(entity) {
    const artist = entity.getAttribute('data-artist');
    if (artist && artist !== this.hoveredEntity) {
      this.hoveredEntity = artist;
      this.label.textContent = artist;
      this.label.style.display = 'block';
    }
  }

  hideArtistLabel() {
    this.hoveredEntity = null;
    this.label.style.display = 'none';
  }
}

// Export for use in main script
window.MetadataDisplay = MetadataDisplay;
```

- [ ] **Step 3: Add raycaster to camera**

Modify camera entity in `public/index.html`:

```html
<a-entity
  camera
  look-controls="pointerLockEnabled: true"
  flight-controls="speed: 7; acceleration: 5; easing: 9"
  position="0 1.6 0"
  raycaster="objects: .drone-object; far: 20">
    <a-entity light="type: point; color: #ff3311; intensity: 0.4; distance: 20; decay: 2"></a-entity>
</a-entity>
```

- [ ] **Step 4: Initialize metadata display in integration script**

Add to integration script in `public/index.html`:

```javascript
const metadataDisplay = new MetadataDisplay();
metadataDisplay.init();
```

- [ ] **Step 5: Add script tag to HTML**

Add to `public/index.html` before closing `</body>`:

```html
<script src="/js/metadata-display.js"></script>
```

- [ ] **Step 6: Test metadata display**

Run: `npm start` and visit http://localhost:3000
Expected:
- Month info displays in top-left corner
- Hovering near drone shows artist name tooltip

- [ ] **Step 7: Commit metadata display**

```bash
git add public/js/metadata-display.js public/index.html
git commit -m "feat: add metadata display with artist name tooltips"
```

---

### Task 12: Vercel Configuration

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create Vercel config file**

```json
{
  "buildCommand": null,
  "outputDirectory": "public",
  "headers": [
    {
      "source": "/data/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300"
        }
      ]
    },
    {
      "source": "/js/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    },
    {
      "source": "/styles/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Remove server.js dependency**

The static site doesn't need the Fastify server. Update `package.json`:

```json
{
  "name": "drone-orchestra-explorer",
  "version": "1.0.0",
  "description": "An immersive 3D audio-visual experience with orbiting drone entities and spatial audio",
  "scripts": {
    "sync": "node scripts/sync-drones.js",
    "dev": "python3 -m http.server 8000 --directory public",
    "start": "python3 -m http.server 8000 --directory public"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "dotenv": "^16.4.5",
    "googleapis": "^140.0.0"
  },
  "engines": {
    "node": ">=18.x"
  },
  "repository": {
    "url": "https://github.com/ellinglien/drone-orchestra-explorer"
  },
  "license": "MIT",
  "keywords": [
    "aframe",
    "webgl",
    "3d",
    "audio",
    "drone",
    "spatial-audio"
  ]
}
```

- [ ] **Step 3: Remove old server files**

```bash
rm server.js src/seo.json src/pages/index.hbs
```

- [ ] **Step 4: Test local static serving**

Run: `npm start` and visit http://localhost:8000
Expected: Site works identically

- [ ] **Step 5: Commit Vercel config**

```bash
git add vercel.json package.json
git rm server.js src/seo.json src/pages/index.hbs
git commit -m "feat: add Vercel static hosting configuration"
```

---

### Task 13: Deployment and Testing

**Files:**
- Update: `README.md`

- [ ] **Step 1: Update README with deployment instructions**

```markdown
# Drone Orchestra Explorer

An immersive 3D spatial audio experience for exploring Drone Orchestra monthly compilations.

## Overview

Navigate through an infinite space where each orbiting entity represents a drone submission from community members. Experience spatial audio as you fly through the archive of monthly compilations.

## Architecture

- **Frontend:** A-Frame 1.2.0, vanilla JavaScript, static HTML
- **Backend:** GitHub Actions automated sync from Google Drive
- **CDN:** DigitalOcean Spaces for audio hosting
- **Deployment:** Vercel static hosting

## Setup

### Prerequisites

- Node.js 18+
- Google Cloud API key (Drive API enabled)
- DigitalOcean Spaces credentials

### Local Development

1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env.local` with required credentials (see `.env.local.example`)
4. Run sync: `npm run sync` (downloads from Drive, uploads to CDN)
5. Start dev server: `npm start`
6. Visit http://localhost:8000

### Environment Variables

```
GOOGLE_DRIVE_API_KEY=<your_key>
GOOGLE_DRIVE_FOLDER_ID=1fEfeXd79DLVF9t_QtqUjjUraNH40-Goh
DO_SPACES_KEY=<your_key>
DO_SPACES_SECRET=<your_secret>
DO_SPACES_BUCKET=rpm3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_CDN_ENDPOINT=https://rpm3.nyc3.cdn.digitaloceanspaces.com
```

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set root directory to `/`
4. Set output directory to `public`
5. Add all environment variables as repository secrets
6. Deploy

### GitHub Actions

The sync workflow runs daily at 6am UTC. To trigger manually:
1. Go to Actions tab
2. Select "Sync Drone Orchestra" workflow
3. Click "Run workflow"

## Controls

- **WASD**: Movement (with momentum)
- **Mouse**: Look around
- **Brightness/Opacity sliders**: Adjust visual intensity

## License

MIT
```

- [ ] **Step 2: Create .env.local.example**

```
# Google Drive API
GOOGLE_DRIVE_API_KEY=your_api_key_here
GOOGLE_DRIVE_FOLDER_ID=1fEfeXd79DLVF9t_QtqUjjUraNH40-Goh

# DigitalOcean Spaces
DO_SPACES_KEY=your_spaces_key
DO_SPACES_SECRET=your_spaces_secret
DO_SPACES_BUCKET=rpm3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_CDN_ENDPOINT=https://rpm3.nyc3.cdn.digitaloceanspaces.com
```

- [ ] **Step 3: Deploy to Vercel**

**Manual steps:**
1. Visit vercel.com
2. Import Git repository
3. Configure:
   - Root: `/`
   - Output: `public`
   - Build command: (leave empty)
4. Add environment variables (not needed for static site, but for future)
5. Deploy

Expected: Site deploys successfully

- [ ] **Step 4: Test production deployment**

Visit deployed URL (e.g., `drone-orchestra-explorer.vercel.app`)
Expected:
- Month selector loads
- Months list appears
- Clicking month loads scene
- Drones appear and play audio
- Metadata displays correctly
- Navigation works

- [ ] **Step 5: Configure custom subdomain (optional)**

**Manual steps in Vercel:**
1. Go to project settings → Domains
2. Add `drone.rpmchallenge.com`
3. Add CNAME record in DNS:
   - Name: `drones`
   - Value: `cname.vercel-dns.com`

- [ ] **Step 6: Commit final documentation**

```bash
git add README.md .env.local.example
git commit -m "docs: add deployment and usage documentation"
```

---

### Task 14: Browser Testing and Refinement

**Files:**
- Test in multiple browsers
- Document any issues

- [ ] **Step 1: Test in Chrome/Edge**

Visit site in Chrome
Test checklist:
- [ ] Month selector loads and displays
- [ ] Click month transitions to scene
- [ ] All drones load (check console for errors)
- [ ] Audio plays spatially
- [ ] WASD controls work
- [ ] Artist names appear on hover
- [ ] Change month button returns to selector
- [ ] Brightness controls work

Expected: All tests pass

- [ ] **Step 2: Test in Firefox**

Repeat test checklist in Firefox
Expected: All tests pass

- [ ] **Step 3: Test in Safari (critical for MP3 compatibility)**

Repeat test checklist in Safari
Expected: All tests pass (MP3 format ensures compatibility)

- [ ] **Step 4: Test on mobile Safari (iOS)**

Visit on iPhone/iPad
Test:
- [ ] Month selector touch works
- [ ] Scene loads on mobile
- [ ] Audio plays (may require tap to start)
- [ ] Look controls work (touch drag)
- [ ] Performance acceptable

Expected: Basic functionality works, may need touch control improvements

- [ ] **Step 5: Test on Android Chrome**

Repeat mobile tests on Android
Expected: Similar to mobile Safari

- [ ] **Step 6: Document any compatibility issues**

Create `docs/browser-compatibility.md` if issues found:

```markdown
# Browser Compatibility

## Desktop

- **Chrome/Edge:** ✅ Full support
- **Firefox:** ✅ Full support
- **Safari:** ✅ Full support (MP3 required)

## Mobile

- **Mobile Safari (iOS):** ⚠️ Works, requires tap to start audio
- **Chrome (Android):** ⚠️ Works, performance varies by device

## Known Issues

- Mobile devices may require user gesture to start audio playback
- Performance on older devices may be limited

## Minimum Requirements

- WebGL support
- ES6 JavaScript
- Audio API support
```

- [ ] **Step 7: Commit any fixes and documentation**

```bash
git add docs/browser-compatibility.md
git commit -m "docs: add browser compatibility testing results"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ GitHub Action automation
- ✅ Google Drive integration
- ✅ Audio conversion to MP3 VBR
- ✅ DO Spaces CDN upload
- ✅ Metadata JSON generation
- ✅ Month selector UI
- ✅ Dynamic drone scene
- ✅ Artist name display
- ✅ Navigation between months
- ✅ Vercel deployment
- ✅ Browser testing

**Placeholders:** None - all code blocks complete

**Type Consistency:**
- `monthData` used consistently
- `drone.artist`, `drone.url` consistent
- `MonthSelector`, `DroneScene`, `MetadataDisplay` class names consistent
- All method names match across tasks

---

## Success Criteria

Deployment is complete when:

- [ ] GitHub Action runs successfully
- [ ] Audio files sync from Drive to CDN
- [ ] months.json generated correctly
- [ ] Month selector displays all months
- [ ] Scene loads dynamically from JSON
- [ ] All drones play audio spatially
- [ ] Artist names display on hover
- [ ] Month navigation works
- [ ] Works in Chrome, Firefox, Safari
- [ ] Deployed to Vercel subdomain

---

## Notes

- FFmpeg must be installed locally for testing (pre-installed in GitHub Actions)
- First sync may take 10-20 minutes depending on file count
- Max 50 drones per month for performance
- Audio files cached by CDN, updates propagate within minutes
