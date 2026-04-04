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
