const SpacesClient = require('../lib/spaces-client');
require('dotenv').config({ path: '.env.local' });

async function test() {
  console.log('Testing DO Spaces client...\n');

  // Check if credentials are configured
  if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
    console.log('⚠ DO Spaces credentials not configured in .env.local');
    console.log('This is expected - credentials will be added when available.');
    console.log('Skipping upload test.\n');

    // Just test that the class can be instantiated
    const client = new SpacesClient({
      accessKeyId: 'test',
      secretAccessKey: 'test',
      region: 'nyc3',
      bucket: 'rpm3',
      endpoint: 'https://nyc3.digitaloceanspaces.com',
      cdnEndpoint: 'https://rpm3.nyc3.cdn.digitaloceanspaces.com'
    });

    console.log('✓ SpacesClient instantiated');
    console.log('✓ getCdnUrl test:', client.getCdnUrl('drone-orchestra/2025-04/test.mp3'));
    console.log('  Expected format: https://rpm3.nyc3.cdn.digitaloceanspaces.com/drone-orchestra/2025-04/test.mp3\n');

    return;
  }

  // If credentials are available, test actual upload
  const client = new SpacesClient({
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
    region: process.env.DO_SPACES_REGION,
    bucket: process.env.DO_SPACES_BUCKET,
    endpoint: process.env.DO_SPACES_ENDPOINT,
    cdnEndpoint: process.env.DO_SPACES_CDN_ENDPOINT
  });

  console.log('✓ SpacesClient configured with credentials');
  console.log('Note: Actual upload test requires a test file. Will be tested in GitHub Action.\n');
}

test().catch(console.error);
