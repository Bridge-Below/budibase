const Koa = require("koa")
const destroyable = require("server-destroy")
const electron = require("electron")
const koaBody = require("koa-body")
const logger = require("koa-pino-logger")
const http = require("http")
const api = require("./api")
const env = require("./environment")
const eventEmitter = require("./events")
const automations = require("./automations/index")
const Sentry = require("@sentry/node")
const selfhost = require("./selfhost")

const app = new Koa()

// set up top level koa middleware
app.use(
  koaBody({
    multipart: true,
    formLimit: "10mb",
    jsonLimit: "10mb",
    textLimit: "10mb",
    enableTypes: ["json", "form", "text"],
  })
)

app.use(
  logger({
    prettyPrint: {
      levelFirst: true,
    },
    level: env.LOG_LEVEL || "error",
  })
)

app.context.eventEmitter = eventEmitter
app.context.auth = {}

// api routes
app.use(api.routes())

if (electron.app && electron.app.isPackaged) {
  env._set("NODE_ENV", "production")
  Sentry.init()

  app.on("error", (err, ctx) => {
    Sentry.withScope(function(scope) {
      scope.addEventProcessor(function(event) {
        return Sentry.Handlers.parseRequest(event, ctx.request)
      })
      Sentry.captureException(err)
    })
  })
}

const server = http.createServer(app.callback())
destroyable(server)

server.on("close", () => console.log("Server Closed"))

module.exports = server.listen(env.PORT || 0, async () => {
  console.log(`Budibase running on ${JSON.stringify(server.address())}`)
  env._set("PORT", server.address().port)
  eventEmitter.emitPort(env.PORT)
  automations.init()
  // only init the self hosting DB info in the Pouch, not needed in self hosting prod
  if (!env.CLOUD) {
    await selfhost.init()
  }
})

process.on("uncaughtException", err => {
  console.error(err)
  server.close()
  server.destroy()
})

process.on("SIGTERM", () => {
  server.close()
  server.destroy()
})
