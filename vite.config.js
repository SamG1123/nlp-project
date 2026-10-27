import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.PORT || process.env.PORT || "3001";

  return {
    server: {
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${apiPort}`,
          configure(proxy) {
            proxy.on("error", (error, _request, response) => {
              console.error("Could not reach the MeetBrief API server.", error);
              if (!response.headersSent) {
                response.writeHead(502, { "Content-Type": "application/json" });
              }
              response.end(JSON.stringify({
                error: 'Minutes API is unavailable. Run "npm run dev" to start both servers.',
              }));
            });
          },
        },
      },
    },
  };
});
