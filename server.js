const fastify = require("fastify")({ logger: false });
const path = require("path");

// Additional imports
const replyFrom = require("fastify-reply-from");

fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

fastify.register(require("@fastify/formbody"));
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

// Register the reply-from plugin
fastify.register(replyFrom);

const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

fastify.get("/", function (request, reply) {
  let params = { seo: seo };
  if (request.query.randomize) {
    const colors = require("./src/colors.json");
    const allColors = Object.keys(colors);
    let currentColor = allColors[(allColors.length * Math.random()) << 0];
    params = {
      color: colors[currentColor],
      colorError: null,
      seo: seo,
    };
  }
  return reply.view("/src/pages/index.hbs", params);
});

fastify.post("/", function (request, reply) {
  let params = { seo: seo };
  let color = request.body.color;
  if (color) {
    const colors = require("./src/colors.json");
    color = color.toLowerCase().replace(/\s/g, "");
    if (colors[color]) {
      params = {
        color: colors[color],
        colorError: null,
        seo: seo,
      };
    } else {
      params = {
        colorError: request.body.color,
        seo: seo,
      };
    }
  }
  return reply.view("/src/pages/index.hbs", params);
});

// Proxy route for audio files
fastify.get("/audio/:file", (request, reply) => {
  const baseUrl = "https://cdn.glitch.global/631d7f96-96a3-4895-825b-dee7104396ff/";
  const file = request.params.file;
  reply.from(baseUrl + file);
});

fastify.listen({ port: process.env.PORT, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
});
