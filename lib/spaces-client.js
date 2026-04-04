const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');

/**
 * Client for uploading files to DigitalOcean Spaces CDN
 */
class SpacesClient {
  /**
   * @param {Object} config
   * @param {string} config.accessKeyId - DO Spaces access key
   * @param {string} config.secretAccessKey - DO Spaces secret key
   * @param {string} config.region - DO Spaces region (e.g., 'nyc3')
   * @param {string} config.bucket - Bucket name (e.g., 'rpm3')
   * @param {string} config.endpoint - DO Spaces endpoint URL
   * @param {string} config.cdnEndpoint - CDN endpoint for public URLs
   */
  constructor(config) {
    this.bucket = config.bucket;

    // Normalize endpoints - add https:// if missing
    this.cdnEndpoint = this.normalizeUrl(config.cdnEndpoint);
    const endpoint = this.normalizeUrl(config.endpoint);

    this.client = new S3Client({
      endpoint: endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  /**
   * Ensures URL has https:// protocol
   * @param {string} url - URL that may or may not have protocol
   * @returns {string} URL with https:// protocol
   */
  normalizeUrl(url) {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  }

  /**
   * Uploads a file to DO Spaces with public-read ACL
   *
   * @param {string} localPath - Path to local file
   * @param {string} remotePath - Path in bucket (e.g., 'drone-orchestra/2025-04/file.mp3')
   * @param {string} contentType - MIME type (default: 'audio/mpeg')
   * @returns {Promise<string>} CDN URL of uploaded file
   */
  async uploadFile(localPath, remotePath, contentType = 'audio/mpeg') {
    try {
      const fileContent = await fs.readFile(localPath);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: remotePath,
        Body: fileContent,
        ContentType: contentType,
        ACL: 'public-read'
      });

      await this.client.send(command);

      // Return CDN URL
      return this.getCdnUrl(remotePath);
    } catch (error) {
      throw new Error(`Failed to upload ${localPath} to ${remotePath}: ${error.message}`);
    }
  }

  /**
   * Generates CDN URL for a file path
   *
   * @param {string} remotePath - Path in bucket
   * @returns {string} Full CDN URL
   */
  getCdnUrl(remotePath) {
    // Remove leading slash if present
    const cleanPath = remotePath.replace(/^\//, '');
    return `${this.cdnEndpoint}/${cleanPath}`;
  }
}

module.exports = SpacesClient;
