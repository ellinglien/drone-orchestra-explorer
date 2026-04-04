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
