import { defineConfig } from "vitest/config";

// Several tests hash with bcrypt, which is slow on small shared-vCPU VMs.
// The deployment installer runs this suite on hosts as small as an e2-micro,
// where the 5s default times out and spawning one worker per file starves
// the two shared cores.
export default defineConfig({
  test: {
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: "forks",
    minWorkers: 1,
    maxWorkers: 2,
  },
});
