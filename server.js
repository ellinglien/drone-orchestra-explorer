const fastify = require("fastify")({ logger: false });
const path = require("path");

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

const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

fastify.get("/", function (request, reply) {
  let params = { seo: seo };
  return reply.view("/src/pages/index.hbs", params);
});

fastify.post("/", function (request, reply) {
  let params = { seo: seo };
  return reply.view("/src/pages/index.hbs", params);
});

fastify.listen({ port: process.env.PORT, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
});
