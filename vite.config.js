import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.PORT || process.env.PORT || "3001";

  return {
    server: {
      proxy: {
        "/api": `http://localhost:${apiPort}`,
      },
    },
  };
});
