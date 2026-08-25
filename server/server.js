import app from "./app.js";
import { env } from "./lib/env.js";

const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`🚀 SecureID Server running at http://localhost:${PORT}`);
  console.log(`==============================================\n`);
});
