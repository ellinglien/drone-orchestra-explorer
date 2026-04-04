const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Converts audio file to MP3 VBR (quality 4, ~165kbps average)
 *
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path to output MP3 file
 * @returns {Promise<void>}
 */
async function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Ensure input file exists
    fs.access(inputPath)
      .then(() => {
        // FFmpeg command: -i input -codec:a libmp3lame -q:a 4 output.mp3
        const ffmpeg = spawn('ffmpeg', [
          '-i', inputPath,
          '-codec:a', 'libmp3lame',
          '-q:a', '4',
          '-y', // Overwrite output file if exists
          outputPath
        ]);

        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
          } else {
            resolve();
          }
        });

        ffmpeg.on('error', (err) => {
          reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
        });
      })
      .catch((err) => {
        reject(new Error(`Input file not found: ${inputPath}`));
      });
  });
}

/**
 * Checks if ffmpeg is available on the system
 *
 * @returns {Promise<boolean>}
 */
async function checkFfmpegAvailable() {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);

    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });

    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

module.exports = {
  convertToMp3,
  checkFfmpegAvailable
};
