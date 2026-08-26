export default async function globalSetup() {
  process.env.NODE_ENV = "test";

  const [{ default: app }, { prisma }] = await Promise.all([
    import("../server/app.js"),
    import("../server/lib/prisma.js"),
  ]);

  const server = app.listen(4000, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  return async () => {
    server.closeIdleConnections?.();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await prisma.$disconnect();
  };
}
