import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(backendDirectory, ".env") });
