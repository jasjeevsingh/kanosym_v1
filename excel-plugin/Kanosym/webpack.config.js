/* eslint-disable no-undef */

const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

const urlDev = "https://localhost:3000/";
const urlProd = "https://www.contoso.com/"; // CHANGE THIS TO YOUR PRODUCTION DEPLOYMENT LOCATION
console.log('>>> USING THIS WEBPACK CONFIG (with /api proxy to 5001)');

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
}

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const config = {
    devtool: "source-map",
    entry: {
      polyfill: ["core-js/stable", "regenerator-runtime/runtime"],
      react: ["react", "react-dom"],
      taskpane: {
        import: ["./src/taskpane/index.tsx", "./src/taskpane/taskpane.html"],
        dependOn: "react",
      },
      noira: {
        import: ["./src/noira/index.tsx", "./src/noira/noira.html"],
        dependOn: "react",
      },
      analytics: {
        import: ["./src/analytics/index.tsx", "./src/analytics/analytics.html"],
        dependOn: "react",
      },
      "classical-test": {
        import: ["./src/dialogs/classical-test.tsx", "./src/dialogs/classical-test.html"],
        dependOn: "react",
      },
      commands: "./src/commands/commands.ts",
    },
    output: {
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".html", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: ["ts-loader"],
        },
        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: "html-loader",
        },
        {
          test: /\.(png|jpg|jpeg|ttf|woff|woff2|gif|ico)$/,
          type: "asset/resource",
          generator: {
            filename: "assets/[name][ext][query]",
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["polyfill", "taskpane", "react"],
      }),
      new HtmlWebpackPlugin({
        filename: "noira.html",
        template: "./src/noira/noira.html",
        chunks: ["polyfill", "noira", "react"],
      }),
      new HtmlWebpackPlugin({
        filename: "analytics.html",
        template: "./src/analytics/analytics.html",
        chunks: ["polyfill", "analytics", "react"],
      }),
      new HtmlWebpackPlugin({
        filename: "dialogs/classical-test.html",
        template: "./src/dialogs/classical-test.html",
        chunks: ["polyfill", "classical-test", "react"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "assets/*",
            to: "assets/[name][ext][query]",
          },
          {
            from: "manifest*.xml",
            to: "[name]" + "[ext]",
            transform(content) {
              if (dev) {
                return content;
              } else {
                return content.toString().replace(new RegExp(urlDev, "g"), urlProd);
              }
            },
          },
          {
            from: "src/dialogs/error.html",
            to: "dialogs/error.html",
          },
          {
            from: "src/dialogs/portfolio-import.html",
            to: "dialogs/portfolio-import.html",
          },
          {
            from: "src/dialogs/success.html",
            to: "dialogs/success.html",
          },
          {
            from: "src/dialogs/results.html",
            to: "dialogs/results.html",
          },
        ],
      }),
      new HtmlWebpackPlugin({
        filename: "commands.html",
        template: "./src/commands/commands.html",
        chunks: ["polyfill", "commands"],
      }),
      new HtmlWebpackPlugin({
        filename: "dialogs/historical-prices.html",
        template: "./src/dialogs/historical-prices.html",
        chunks: ["polyfill"],
      }),
      new webpack.ProvidePlugin({
        Promise: ["es6-promise", "Promise"],
      }),
    ],
    devServer: {
      hot: true,
  headers: { "Access-Control-Allow-Origin": "*" },
  server: {
    type: "https",
    options: env.WEBPACK_BUILD || options.https !== undefined ? options.https : await getHttpsOptions(),
  },
  port: process.env.npm_package_config_dev_server_port || 3000,

  proxy: [
    {
      context: ["/api"],                 // <— what to proxy
      target: "https://localhost:5001",  // <— your backend
      changeOrigin: true,
      secure: false,                     // dev only (self-signed)
      logLevel: "debug",
      onProxyReq(proxyReq, req) {
        console.log("[proxy] ->", req.method, req.url);
      },
      onProxyRes(proxyRes, req) {
        console.log("[proxy] <-", req.method, req.url, proxyRes.statusCode, proxyRes.headers["content-type"]);
      },
      // If your backend DOESN'T include the /api prefix, uncomment:
      // pathRewrite: { "^/api": "" },
    },
  ],
    },
  };

  return config;
};
