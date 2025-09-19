import http from "node:http";
import { URL } from "node:url";
import log from "electron-log";

const logger = log.scope("polar_checkout_server");

export type PolarCheckoutEvent = {
  type: "success" | "error";
  checkoutId?: string;
  data?: any;
  error?: string;
};

export function startPolarCheckoutServer(options: {
  port?: number;
  onEvent: (evt: PolarCheckoutEvent) => void;
}): { close: () => void; port: number } {
  const port = options.port ?? 4778;
  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url) {
        res.statusCode = 400;
        res.end("Bad Request");
        return;
      }
      const url = new URL(req.url, `http://localhost:${port}`);
      if (req.method === "GET" && url.pathname === "/polar/success") {
        const checkoutId =
          url.searchParams.get("checkout_id") ||
          url.searchParams.get("checkoutId");
        if (!checkoutId) {
          res.statusCode = 400;
          res.end("Missing checkout_id");
          return;
        }
        // Lookup checkout details in Polar API (best-effort)
        const apiKey = process.env.POLAR_API_KEY;
        let payload: any = null;
        if (apiKey) {
          try {
            const response = await fetch(
              `https://api.polar.sh/v1/checkouts/${checkoutId}`,
              {
                headers: { authorization: `Bearer ${apiKey}` },
              } as any,
            );
            if (response.ok) {
              payload = await response.json().catch(() => null);
            } else {
              logger.warn("Polar checkout fetch failed", response.status);
            }
          } catch (e) {
            logger.warn("Polar checkout fetch error", e);
          }
        } else {
          logger.warn("POLAR_API_KEY not set; skipping checkout verification");
        }

        // Notify renderer
        options.onEvent({ type: "success", checkoutId, data: payload });

        // Respond with a minimal HTML page the browser can close
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(
          `<!doctype html><html><body style="font-family: system-ui; padding: 24px; color: #e5e7eb; background: #111827;">
            <h1>Payment Successful</h1>
            <p>You can close this window and return to the app.</p>
            <script>setTimeout(() => window.close(), 800);</script>
          </body></html>`,
        );
        return;
      }
      res.statusCode = 404;
      res.end("Not Found");
    } catch (e: any) {
      logger.error("Polar server error", e);
      options.onEvent({ type: "error", error: e?.message || String(e) });
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  server.listen(port, "127.0.0.1", () => {
    logger.info(`Polar checkout server listening on http://localhost:${port}`);
  });

  return {
    close: () => server.close(),
    port,
  };
}
