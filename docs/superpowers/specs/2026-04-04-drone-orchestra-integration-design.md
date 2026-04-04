# Drone Orchestra Explorer - Integration Design

**Date:** 2026-04-04
**Status:** Draft
**Deployment:** Separate Vercel project, subdomain (e.g., drones.rpmchallenge.com)

## Overview

Transform the existing Drone Orchestra 3D spatial audio explorer prototype into a production application integrated with the Drone Orchestra community workflow. The app will serve as both a monthly showcase for current submissions and an interactive archive browser for past compilations.

## Goals

1. **Monthly Showcase** - Highlight current month's drone submissions in immersive 3D space
2. **Archive Browser** - Navigate and explore past months' compilations
3. **Automated Sync** - Automatically pull new submissions from Google Drive
4. **Metadata Display** - Show artist names and monthly themes/keys
5. **Zero Maintenance** - Automated workflow requires no manual intervention

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────┐
│  GitHub Action (runs daily, 6am UTC)    │
│  1. Fetch Google Drive folder list      │
│  2. Download new audio files            │
│  3. Convert to MP3 VBR                  │
│  4. Upload to DO Spaces CDN             │
│  5. Generate metadata JSON              │
│  6. Commit JSON to repo                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Vercel Deployment                      │
│  - Static HTML/A-Frame app              │
│  - public/data/months.json              │
│  - Audio streams from DO Spaces CDN     │
└─────────────────────────────────────────┘
```

### Technology Stack

- **Frontend:** A-Frame 1.2.0, vanilla JavaScript
- **Hosting:** Vercel (static deployment)
- **CDN:** DigitalOcean Spaces (same as RPM site)
- **Automation:** GitHub Actions (free for public repos)
- **API:** Google Drive API (read-only, public folder)

## Data Flow

### Google Drive Structure

```
/Drone Orchestra/
  ├── 2025-01/
  ├── 2025-02/
  ├── 2025-04 Chaos/      # Theme in folder name
  ├── 2025-05 D Minor/    # Key signature in folder name
  └── 2026-01/
```

**Folder naming conventions:**
- Basic: `YYYY-MM` (e.g., "2025-01")
- With theme: `YYYY-MM Theme` (e.g., "2025-04 Chaos")
- With key: `YYYY-MM Key` (e.g., "2025-05 D Minor")
- Complex: `YYYY-MM Theme - Key` (e.g., "2024-12 Winter Solstice - A Major")

### GitHub Action Workflow

**File:** `.github/workflows/sync-drone-orchestra.yml`

**Triggers:**
- Scheduled: Daily at 6am UTC (cron)
- Manual: workflow_dispatch for testing

**Steps:**

1. **Fetch Drive folder list**
   - Use googleapis to query folder ID: `1fEfeXd79DLVF9t_QtqUjjUraNH40-Goh`
   - Parse folder names for month ID and theme

2. **Compare with existing data**
   - Load current `public/data/months.json`
   - Identify new folders or changed file counts

3. **Download new audio files**
   - List files in new/changed month folders
   - Download to temp directory
   - Parse artist names from filenames

4. **Convert audio to MP3**
   - Use ffmpeg (pre-installed in GitHub Actions)
   - Command: `ffmpeg -i input.{ext} -codec:a libmp3lame -q:a 4 output.mp3`
   - VBR quality 4 = ~165kbps average (good for ambient/drone)
   - Handles WAV, FLAC, MP3, OGG, M4A inputs

5. **Upload to DO Spaces**
   - Use `@aws-sdk/client-s3` (same pattern as RPM site)
   - Path: `drone-orchestra/{YYYY-MM}/{sanitized-filename}.mp3`
   - ACL: public-read
   - Bucket: rpm3 (shared with RPM site)

6. **Generate metadata JSON**
   - Create/update `public/data/months.json`
   - Include: month ID, display name, theme, drone list with artists and URLs

7. **Commit and push**
   - Commit updated JSON to main branch
   - Vercel auto-deploys on push

**Environment secrets required:**
- `GOOGLE_DRIVE_API_KEY` - Google Cloud API key
- `GOOGLE_DRIVE_FOLDER_ID` - Root folder: `1fEfeXd79DLVF9t_QtqUjjUraNH40-Goh`
- `DO_SPACES_KEY` - DigitalOcean Spaces access key (from RPM site)
- `DO_SPACES_SECRET` - DigitalOcean Spaces secret (from RPM site)
- `DO_SPACES_BUCKET` - Bucket name: `rpm3`
- `DO_SPACES_ENDPOINT` - `https://nyc3.digitaloceanspaces.com`
- `DO_SPACES_CDN_ENDPOINT` - `https://rpm3.nyc3.cdn.digitaloceanspaces.com`

### Generated Metadata Structure

**File:** `public/data/months.json`

```json
{
  "generated": "2025-04-04T12:00:00Z",
  "months": [
    {
      "id": "2025-04",
      "name": "April 2025",
      "theme": "Chaos",
      "droneCount": 11,
      "drones": [
        {
          "artist": "USTAKNOW",
          "url": "https://rpm3.nyc3.cdn.digitaloceanspaces.com/drone-orchestra/2025-04/ustaknow-chaos-drone.mp3",
          "originalFilename": "USTAKNOW_ALIAS_CR05APR2025__CHAOS_DRONE_STEM.ogg"
        },
        {
          "artist": "Mikey Hogan",
          "url": "https://rpm3.nyc3.cdn.digitaloceanspaces.com/drone-orchestra/2025-04/mikey-chaos.mp3",
          "originalFilename": "Mikey - Drone Orchestra Apr 25 Chaos.ogg"
        }
      ]
    },
    {
      "id": "2025-05",
      "name": "May 2025",
      "theme": null,
      "droneCount": 8,
      "drones": [...]
    }
  ]
}
```

**Artist name parsing:**
- Extract from filename before first dash/underscore
- Common patterns: "Artist - Title.ext", "Artist_Title.ext"
- Fallback: Use full filename if unparseable

## Frontend Implementation

### File Structure

```
drone-orchestra-explorer/
├── .github/
│   └── workflows/
│       └── sync-drone-orchestra.yml
├── public/
│   ├── index.html
│   ├── data/
│   │   └── months.json              # Generated by GitHub Action
│   ├── js/
│   │   ├── month-selector.js        # Month selection UI
│   │   ├── drone-scene.js           # A-Frame scene controller
│   │   └── metadata-display.js      # Artist overlays
│   └── styles/
│       └── main.css
├── scripts/
│   └── sync-drones.js               # Used by GitHub Action
├── lib/
│   ├── drive-client.js              # Google Drive API wrapper
│   └── audio-converter.js           # FFmpeg wrapper
├── .env.local                        # Local dev only (not committed)
├── .gitignore
├── vercel.json
└── package.json
```

### User Experience Flow

**Initial Load:**

1. User visits subdomain (e.g., drones.rpmchallenge.com)
2. Month selector overlay appears with loading state
3. Fetches `/data/months.json`
4. Displays chronological list (newest first)
5. Current/latest month highlighted

**Month Selection:**

6. User clicks "April 2025 - Chaos"
7. Overlay shows "Loading drones..." with fade
8. Month selector slides/fades away
9. A-Frame scene initializes with 3D space
10. Drones fade in one by one (staggered animation - existing behavior)

**In-Scene Experience:**

11. User navigates 3D space with WASD + mouse (existing controls)
12. Each orbiting entity is one artist's drone submission
13. Artist name appears on hover/raycasting
14. Corner overlay shows: "April 2025 - Theme: Chaos"
15. "◄ Change Month" button returns to selector

**Navigation Between Months:**

16. Click "Change Month" → fade scene to black
17. Return to month selector overlay
18. Select different month → fade transition, reload drones

### Component Architecture

**`public/index.html`** - Main Page
- Month selector overlay (visible on load)
- A-Frame scene container (hidden until month selected)
- Metadata display elements
- Dark brutalist styling (minimal, stark)
- Same red/orange space aesthetic as prototype

**`public/js/month-selector.js`** - Month Selection UI
```javascript
// Responsibilities:
- Fetch /data/months.json on load
- Render chronological month list
- Highlight current/latest month
- Handle month selection click
- Emit event with selected month data
- Manage overlay show/hide transitions
```

**`public/js/drone-scene.js`** - 3D Scene Controller
```javascript
// Responsibilities:
- Receive month data from selector
- Create A-Frame entities dynamically (replace hardcoded assets)
- Load audio from CDN URLs
- Initialize existing A-Frame components:
  * orbital-motion (keep unchanged)
  * flight-controls (keep unchanged)
  * brightness-control (keep unchanged)
- Attach artist metadata to entities
- Handle scene cleanup on month change
```

**`public/js/metadata-display.js`** - Info Overlays
```javascript
// Responsibilities:
- Display month info: "April 2025 - Theme: Chaos"
- Show artist name on entity hover/raycast
- Render "◄ Change Month" button
- Handle return to selector
```

### A-Frame Components (Preserved)

All existing custom A-Frame components remain unchanged:

- **`flight-controls`** - WASD movement with inertia
- **`orbital-motion`** - Entity orbiting animation
- **`brightness-control`** - Brightness/opacity sliders
- **`smooth-look-controls`** - Camera damping

### Migration from Prototype

**Keep:**
- All A-Frame components (orbital-motion, flight-controls, etc.)
- Visual aesthetic (dark red/orange space, planet below)
- Control scheme (WASD + mouse)
- Brightness/opacity controls
- Staggered entity fade-in animation

**Replace:**
- Hardcoded `<audio>` assets → Dynamic loading from months.json
- Hardcoded entity creation loop → Data-driven from API
- Static 11 drones → Variable count per month

**Add:**
- Month selector overlay UI
- Artist name hover/display
- Month theme display
- Navigation between months

## Error Handling

### GitHub Action Failures

**Drive API Issues:**
- Rate limit hit → Skip run, retry next day
- Folder not found → Log error, don't update JSON, alert via email
- Network error → Retry 3x with exponential backoff

**File Processing:**
- Audio conversion fails → Log warning, skip file, continue with others
- DO Spaces upload fails → Retry 3x, skip file if still fails
- File >100MB → Log warning, skip (too large for web delivery)

**Data Consistency:**
- Validate JSON schema before commit
- If month data incomplete, don't add to months.json
- Rollback on commit failure (don't push partial data)

### Browser/Client Errors

**Loading Failures:**
- `months.json` 404/error → Show overlay: "Failed to load months. Refresh or contact admin."
- Audio file 404 → Skip that drone, log to console, show notification
- Network timeout → Retry audio load 2x, then skip

**Browser Compatibility:**
- WebGL not supported → Show error: "This experience requires WebGL. Try Chrome or Firefox."
- Audio context blocked → Show "Click to enable audio" overlay (autoplay policy)
- Mobile/touch device → Add touch control info to intro overlay

**Performance:**
- Max 50 drones per scene (if folder has >50 files, take first 50 alphabetically)
- Staggered audio loading prevents bandwidth overload (existing fade-in)
- If poor performance detected, show hint to reduce brightness/opacity

### Edge Cases

**Missing or Malformed Data:**
- Month folder empty → Include in months.json with `droneCount: 0`, show "No submissions yet"
- Filename unparseable → Use full filename as artist name
- Folder name doesn't match `YYYY-MM` pattern → Skip folder, log warning
- Duplicate filenames → Append `-1`, `-2` suffix to uploaded filename

**Audio Format Support:**
- All formats converted to MP3 VBR in GitHub Action
- Browser receives consistent MP3 format
- No client-side format detection needed

## Visual Design

### Aesthetic

**Style:** Dark brutalist minimalism
- Black background
- Red/orange accent colors
- High contrast
- Minimal UI elements
- Stark typography

**3D Space:**
- Deep black void
- Dark red/orange planet below (like ISS view)
- Dim ambient red lighting
- Orbiting drone entities (simple box geometry)
- Atmospheric glow on planet horizon

**UI Elements:**
- Month selector: Centered overlay, dark background, red highlights
- Artist names: Small floating labels near entities
- Month info: Corner overlay, minimal text
- Controls: Hidden until user interaction

### Responsive Considerations

**Desktop (primary target):**
- Full 3D experience
- WASD + mouse controls
- Hover states for artist names

**Mobile/Tablet (secondary):**
- Touch controls for movement
- Gyroscope for look controls (optional)
- Tap entity to show artist name
- Simplified visual effects for performance

## Deployment

### Vercel Configuration

**File:** `vercel.json`

```json
{
  "buildCommand": null,
  "outputDirectory": "public",
  "headers": [
    {
      "source": "/data/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=300" }
      ]
    }
  ]
}
```

**Build Settings:**
- Framework Preset: Other
- Root Directory: `.`
- Build Command: (none - static files)
- Output Directory: `public`

**Domain:**
- Custom subdomain: `drones.rpmchallenge.com`
- Or: `drone-orchestra.vercel.app` (temporary)

### GitHub Repository Settings

**Secrets (Actions):**
- Add all environment secrets listed above
- Copy DO Spaces credentials from RPM site repo

**Branch Protection:**
- Protect `main` branch
- Require workflow success before merge (after initial setup)

## Testing Strategy

### Local Development

**Setup:**
1. Clone repo
2. Create `.env.local` with all secrets
3. Run `node scripts/sync-drones.js` to test sync locally
4. Serve `public/` with local server (e.g., `python -m http.server`)
5. Test month selection and scene loading

### GitHub Action Testing

**Initial Test:**
1. Push workflow file to repo
2. Manually trigger via workflow_dispatch
3. Check Actions tab for execution logs
4. Verify `months.json` committed correctly
5. Verify files uploaded to DO Spaces

**Validation:**
- Confirm JSON schema is valid
- Check all audio URLs return 200
- Verify artist names parsed correctly
- Test with empty folder, single file, 50+ files

### Browser Testing

**Browsers:**
- Chrome/Edge (primary)
- Firefox
- Safari (MP3 compatibility critical)
- Mobile Safari (iOS)
- Chrome Android

**Test Cases:**
- Month selector loads and displays months
- Month selection transitions to 3D scene
- All drones load and play audio
- Artist names appear on hover
- Navigation between months works
- Error states display correctly
- Performance acceptable with 20+ drones

## Future Enhancements

**Potential additions (not in initial scope):**

- **Final mix playback:** Toggle to hear compiled mix instead of individual tracks
- **Theme-based visuals:** Different color schemes per month theme
- **Artist profiles:** Click entity to see artist info/past submissions
- **Social sharing:** Generate screenshot/share link to specific month
- **Analytics:** Track which months get most visitors
- **VR mode:** A-Frame VR support for immersive headset experience
- **Submission portal:** Allow direct uploads instead of Google Drive (major feature)

## Success Criteria

**Launch Requirements:**

- [x] Design approved
- [ ] GitHub Action successfully syncs from Drive
- [ ] Audio converts to MP3 VBR correctly
- [ ] Files upload to DO Spaces CDN
- [ ] months.json generated with correct structure
- [ ] Month selector UI functional
- [ ] 3D scene loads drones dynamically
- [ ] Artist names display correctly
- [ ] Works in Chrome, Firefox, Safari
- [ ] Deployed to Vercel subdomain
- [ ] Zero errors for at least 3 test months

**Community Integration:**

- Shared in Drone Orchestra Discord
- Added to RPM website navigation (link)
- Included in monthly REM submission announcements

## Timeline

No timeline estimates - focus on implementation steps in order:

1. GitHub Action setup and Drive integration
2. Audio conversion and CDN upload
3. Metadata JSON generation
4. Month selector UI
5. Scene controller integration
6. Metadata display components
7. Testing and refinement
8. Deployment and DNS configuration
