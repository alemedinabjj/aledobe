import { build } from "esbuild"

const bundled = /^(@nestjs\/|@sentry\/nestjs)/
const optional = [
  "@nestjs/microservices",
  "@nestjs/websockets",
  "@nestjs/websockets/socket-module",
  "@nestjs/microservices/microservices-module",
  "@fastify/static",
  "@fastify/view",
]

await build({
  entryPoints: ["dist/serverless.js"],
  outfile: "dist/serverless.bundle.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  sourcemap: false,
  logLevel: "warning",
  plugins: [
    {
      name: "externals",
      setup(b) {
        b.onResolve({ filter: /prisma\/generated\/client$/ }, () => ({
          path: "../prisma/generated/client",
          external: true,
        }))
        b.onResolve({ filter: /^[^./]/ }, (args) => {
          if (optional.some((m) => args.path === m || args.path.startsWith(`${m}/`)))
            return { path: args.path, external: true }
          if (bundled.test(args.path)) return undefined
          return { path: args.path, external: true }
        })
      },
    },
  ],
})
