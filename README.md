# Drone Orchestra Explorer

An immersive 3D audio-visual experience with orbiting drone entities and spatial audio. Navigate through an abstract representation of drone performances captured during the RPM Challenge.

## Features

- **Immersive 3D Environment**: Built with A-Frame/WebGL
- **Spatial Audio**: Multi-channel drone audio synchronized with visual entities
- **Interactive Navigation**: Free-flight camera controls with momentum
- **Monthly Data**: Browse drone performances by month
- **Responsive Controls**: Keyboard navigation (WASD) with mouse look
- **Visual Customization**: Adjustable brightness and opacity

## Prerequisites

- Node.js 18.x or higher
- npm or yarn

## Getting Started

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/ellinglien/drone-orchestra-explorer.git
cd drone-orchestra-explorer
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` with required variables (if syncing data):
```
GOOGLE_DRIVE_API_KEY=your_key
GOOGLE_DRIVE_FOLDER_ID=your_folder_id
DO_SPACES_KEY=your_key
DO_SPACES_SECRET=your_secret
DO_SPACES_BUCKET=your_bucket
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_CDN_ENDPOINT=https://your-bucket.nyc3.cdn.digitaloceanspaces.com
```

4. Start the development server:
```bash
npm start
```

The server will listen on `http://localhost:3000`

### Syncing Data

To sync drone audio files from Google Drive:

```bash
npm run sync
```

This script:
- Fetches audio files from Google Drive
- Converts to MP3 format
- Uploads to DigitalOcean Spaces CDN
- Generates `public/data/months.json`

## Building for Production

To build the static site for deployment:

```bash
npm run build
```

This generates `public/index.html` by rendering the Handlebars template with the current SEO configuration.

## Deployment

### Vercel Deployment

This project is configured for deployment on Vercel as a static site.

**Setup:**

1. Push this repository to GitHub
2. Import project in Vercel dashboard (https://vercel.com/new)
3. Configure build settings:
   - Framework Preset: Other
   - Root Directory: `.` (default)
   - Build Command: `npm run build`
   - Output Directory: `public`
4. Click Deploy

Vercel will automatically build and deploy on every push to main.

**GitHub Actions Integration:**

The `sync-drone-orchestra` GitHub Action runs daily at 6am UTC to:
- Fetch audio files from Google Drive
- Convert to MP3 format
- Upload to DigitalOcean Spaces CDN
- Generate `public/data/months.json`
- Commit changes to repository

Vercel will automatically redeploy when the action commits new data.

**Required GitHub Secrets:**

Configure these in repository settings (Settings → Secrets and variables → Actions):

- `GOOGLE_DRIVE_API_KEY` - Google Drive API key
- `GOOGLE_DRIVE_FOLDER_ID` - Drone Orchestra folder ID
- `DO_SPACES_KEY` - DigitalOcean Spaces access key
- `DO_SPACES_SECRET` - DigitalOcean Spaces secret key
- `DO_SPACES_BUCKET` - Bucket name (e.g., rpm3)
- `DO_SPACES_ENDPOINT` - https://nyc3.digitaloceanspaces.com
- `DO_SPACES_CDN_ENDPOINT` - https://rpm3.nyc3.cdn.digitaloceanspaces.com (adjust for your bucket)
- `DO_SPACES_REGION` - nyc3

### Custom Domain

To use a custom subdomain (e.g., drones.rpmchallenge.com):

1. In Vercel project settings, go to Domains
2. Add `drones.rpmchallenge.com`
3. Configure DNS at your domain registrar:
   - Type: CNAME
   - Name: drones
   - Value: cname.vercel-dns.com
4. Wait for DNS propagation (~5-60 minutes)

## Project Structure

```
.
├── public/                 # Static assets served by Vercel
│   ├── index.html         # Generated during build
│   ├── audio/             # Drone audio files
│   ├── data/              # JSON metadata (months.json)
│   ├── js/                # Client-side scripts
│   └── styles/            # CSS stylesheets
├── src/
│   ├── pages/             # Handlebars templates
│   │   └── index.hbs      # Main page template
│   └── seo.json           # SEO and metadata
├── scripts/
│   ├── sync-drones.js     # Data sync script
│   └── build-static.js    # Static build script
├── server.js              # Development server (for local use)
├── package.json
├── vercel.json            # Vercel configuration
└── .vercelignore          # Files to exclude from deployment
```

## Controls

Once the experience starts:

- **Movement**: W (forward), S (backward), A (left), D (right)
- **Look**: Mouse to look around
- **Brightness**: Adjust with sliders in bottom right
- **Change Month**: Click "Change Month" button in metadata display

## Browser Requirements

- Modern browser with WebGL support
- Recommended: Chrome, Firefox, or Safari (desktop)
- For best experience: use headphones for spatial audio

## License

MIT

## Credits

Built with:
- [A-Frame](https://aframe.io/) - Web framework for VR
- [Three.js](https://threejs.org/) - 3D graphics library
- [Fastify](https://www.fastify.io/) - Server framework
- [Handlebars](https://handlebarsjs.com/) - Templating
