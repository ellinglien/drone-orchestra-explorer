const fastify = require('fastify')({ logger: false });
const fs = require('fs').promises;
const path = require('path');

async function buildStatic() {
  try {
    // Register view engine
    await fastify.register(require('@fastify/view'), {
      engine: { handlebars: require('handlebars') },
      root: path.join(__dirname, '..', 'src', 'pages')
    });

    // Read SEO config
    const seoPath = path.join(__dirname, '..', 'src', 'seo.json');
    const seoData = JSON.parse(await fs.readFile(seoPath, 'utf-8'));

    // Update URL for deployed version if using glitch-default
    if (seoData.url === 'glitch-default') {
      seoData.url = 'https://drones.rpmchallenge.com';
    }

    // Generate index.html
    const html = await fastify.view('index.hbs', { seo: seoData });
    const outputPath = path.join(__dirname, '..', 'public', 'index.html');

    await fs.writeFile(outputPath, html);
    console.log('✓ Generated public/index.html');

    await fastify.close();
    process.exit(0);
  } catch (err) {
    console.error('Build failed:', err.message);
    await fastify.close();
    process.exit(1);
  }
}

buildStatic();
