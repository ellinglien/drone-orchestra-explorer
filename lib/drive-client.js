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
   * Download a file from Google Drive with retry on transient failures.
   *
   * The API returns an ArrayBuffer for successful reads (because we
   * asked for `responseType: 'arraybuffer'`). On errors, googleapis
   * hands the error body back as an ArrayBuffer too, which makes
   * `error.message` stringify to the literal string
   * "[object ArrayBuffer]" — completely opaque. Decode the body here
   * so callers see the actual message (usually "User rate limit
   * exceeded" or "Quota exceeded"), and retry a few times on the
   * transient statuses (403 rate-limit, 429, 5xx).
   *
   * Also sleeps 200ms between successful downloads so we don't burn
   * through Drive's per-100-second cap on a full sync.
   */
  async downloadFile(fileId, attempt = 0) {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      // Small cooperative delay so a sync that walks dozens of large
      // files doesn't burst-hit the per-100-second quota.
      await new Promise(r => setTimeout(r, 200));
      return Buffer.from(response.data);
    } catch (error) {
      const status = error.response?.status || error.code;
      // Decode ArrayBuffer body back to a readable error message.
      let msg = error.message;
      const body = error.response?.data;
      if (body && body instanceof ArrayBuffer) {
        try {
          const text = Buffer.from(body).toString('utf8');
          const parsed = JSON.parse(text);
          msg = parsed.error?.message || text.slice(0, 300);
        } catch {
          msg = Buffer.from(body).toString('utf8').slice(0, 300);
        }
      }
      // Rate-limit / server error: retry with backoff. Google Drive uses
      // 403 with "userRateLimitExceeded" for burst limits (not 429), so
      // we treat 403 as retryable too when the body confirms it.
      const isRateLimit = status === 429 || status === 403 || (status >= 500 && status < 600);
      if (isRateLimit && attempt < 4) {
        const delay = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
        console.log(`    ⏳ Rate limited (${status}) — retrying in ${delay}ms (attempt ${attempt + 1}/4)`);
        await new Promise(r => setTimeout(r, delay));
        return this.downloadFile(fileId, attempt + 1);
      }
      const err = new Error(`Drive download failed (status ${status}): ${msg}`);
      err.status = status;
      throw err;
    }
  }
}

module.exports = DriveClient;
