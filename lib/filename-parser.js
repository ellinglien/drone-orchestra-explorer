/**
 * Extracts artist name from filename
 * Patterns:
 * - "Artist - Title.ext" → "Artist"
 * - "Artist_Title.ext" → "Artist"
 * - "ArtistTitle.ext" → "ArtistTitle" (fallback)
 */
function parseArtistName(filename) {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

  // Try dash separator
  if (nameWithoutExt.includes(' - ')) {
    return nameWithoutExt.split(' - ')[0].trim();
  }

  // Try underscore separator
  if (nameWithoutExt.includes('_')) {
    return nameWithoutExt.split('_')[0].trim();
  }

  // Fallback: use full filename
  return nameWithoutExt.trim();
}

/**
 * Sanitizes filename for CDN storage
 * - Lowercase
 * - Replace spaces/special chars with hyphens
 * - Remove consecutive hyphens
 * - Keep extension
 */
function sanitizeFilename(filename) {
  const ext = filename.match(/\.[^.]+$/)?.[0] || '';
  const name = filename.replace(/\.[^.]+$/, '');

  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return sanitized + ext;
}

/**
 * Parses month folder name
 * Patterns:
 * - "2025-04" → { id: "2025-04", name: "April 2025", theme: null }
 * - "2025-04 Chaos" → { id: "2025-04", name: "April 2025", theme: "Chaos" }
 * - "2025-05 D Minor" → { id: "2025-05", name: "May 2025", theme: "D Minor" }
 */
function parseMonthFolder(folderName) {
  const match = folderName.match(/^(\d{4})-(\d{2})(?:\s+(.+))?$/);

  if (!match) {
    return null; // Invalid format
  }

  const [, year, month, theme] = match;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthNum = parseInt(month, 10);
  const monthName = monthNames[monthNum - 1];

  return {
    id: `${year}-${month}`,
    name: `${monthName} ${year}`,
    theme: theme ? theme.trim() : null
  };
}

module.exports = {
  parseArtistName,
  sanitizeFilename,
  parseMonthFolder
};
