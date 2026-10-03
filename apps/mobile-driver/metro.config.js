const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Permitir o domínio do Cloud Shell Web Preview
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.headers.host && req.headers.host.includes("cloudshell.dev")) {
        req.headers.origin = `https://${req.headers.host}`;
      }

      return middleware(req, res, next);
    };
  },
};

module.exports = config;
