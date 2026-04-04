const { convertToMp3, checkFfmpegAvailable } = require('../lib/audio-converter');
const fs = require('fs');
const path = require('path');

async function test() {
  console.log('Checking if ffmpeg is available...');
  const ffmpegAvailable = await checkFfmpegAvailable();

  if (!ffmpegAvailable) {
    console.error('❌ FFmpeg not found. Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)');
    process.exit(1);
  }

  console.log('✓ FFmpeg is available\n');

  // Note: This test requires an actual audio file to test with
  // For now, just verify the functions are exported correctly
  console.log('Testing function exports:');
  console.log('- convertToMp3:', typeof convertToMp3); // → "function"
  console.log('- checkFfmpegAvailable:', typeof checkFfmpegAvailable); // → "function"

  console.log('\n✓ Audio converter library ready');
  console.log('Note: Full conversion test requires audio file. Will be tested in GitHub Action.');
}

test().catch(console.error);
