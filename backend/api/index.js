function getHandler() {
  return require("../dist/serverless.bundle.cjs").getHandler()
}

const redact = (text) =>
  String(text ?? "")
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[url]")
    .replace(/(password|secret|token)\S*/gi, "[redacted]")
    .slice(0, 300)

module.exports = async (req, res) => {
  try {
    const app = await getHandler()
    return app(req, res)
  } catch (error) {
    console.error("bootstrap failed", error)
    res.statusCode = 503
    res.setHeader("content-type", "application/json")
    res.end(
      JSON.stringify({
        status: "unavailable",
        node: process.version,
        error: error?.name,
        code: error?.code,
        detail: redact(error?.message),
      }),
    )
  }
}
