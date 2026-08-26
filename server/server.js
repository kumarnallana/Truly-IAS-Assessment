import app from "./app.js";
import { env } from "./lib/env.js";

const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`🚀 SecureID Server running at http://localhost:${PORT}`);
  console.log(`==============================================\n`);
});

// Playwright owns the test server process. Exit immediately when its runner
// requests teardown so adapter resources cannot keep Windows test runs alive.
if (env.NODE_ENV === "test") {
  for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
    process.once(signal, () => process.exit(0));
  }
}
