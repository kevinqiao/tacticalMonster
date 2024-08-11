const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const dotenv = require("dotenv");
const crypto = require("crypto");

// 加载 .env 文件中的环境变量

const env = dotenv.config({ path: ".env.local" }).parsed;

// 将 .env 文件中的变量转换为 webpack 可以使用的格式
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  entry: {
    // w3: "./src/index_sso.tsx", // 第一个入口点
    match3: "./src/index_play.tsx", // 第一个入口点
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
  },

  module: {
    rules: [
      {
        test: /\.zip$/, // 匹配所有的zip文件
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "asset/", // 输出目录
            },
          },
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    browsers: [">0.25%", "not ie 11", "not op_mini all"],
                  },
                  useBuiltIns: "entry",
                  corejs: 3,
                },
              ],
              "@babel/preset-react",
            ],
            plugins: ["@babel/plugin-proposal-optional-chaining"],
            sourceMaps: true,
          },
        },
      },
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre",
      },
      // 处理 .ts 或 .tsx 文件

      {
        test: /\.(ts|tsx)$/, // 处理.ts和.tsx文件
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                "@babel/preset-react",
                "@babel/preset-typescript", // 添加TypeScript预设
              ],
              plugins: ["@babel/plugin-proposal-optional-chaining"],
              sourceMaps: true,
            },
          },
        ],
      },
      // 处理 .css 文件
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      // 处理图片文件
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[name][ext]", // 输出到 dist/images 目录下
        },
      },
    ],
  },
  plugins: [
    // new HtmlWebpackPlugin({
    //   template: "./public/index.html",
    // }),
    new webpack.DefinePlugin(envKeys),
    // new HtmlWebpackPlugin({
    //   template: "./public/index.html",
    //   filename: "index.html",
    //   chunks: ["w3"],
    // }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      filename: "index.html",
      chunks: ["match3"],
    }),
    // new HtmlWebpackPlugin({
    //   template: "./public/index.html",
    //   filename: "index.html",
    //   chunks: ["match3"],
    //   inject: "body",
    //   scriptLoading: "defer",
    //   templateParameters: (compilation, assets, assetTags, options) => {
    //     const nonce = options.nonce || "";
    //     return {
    //       compilation,
    //       webpackConfig: compilation.options,
    //       htmlWebpackPlugin: {
    //         tags: assetTags,
    //         files: assets,
    //         options,
    //       },
    //       nonce,
    //     };
    //   },
    // }),
    new CopyPlugin({
      patterns: [
        { from: "public/resources", to: "resources" },
        { from: "public/avatars", to: "avatars" }, // 将 public 目录下的所有内容复制到构建目录下的 public
        { from: "public/icons", to: "icons" }, // 将 public 目录下的所有内容复制到构建目录下的 public
        { from: "public/www", to: "www" }, // 将 public 目录下的所有内容复制到构建目录下的 public
        { from: "public/assets", to: "assets" }, // 将 public 目录下的所有内容复制到构建目录下的 public
        { from: "public/*.png", to: "images/[name][ext]", noErrorOnMissing: true },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/"),
      util: path.resolve(__dirname, "src/util/"),
      service: path.resolve(__dirname, "src/service/"),
      model: path.resolve(__dirname, "src/model/"),
      component: path.resolve(__dirname, "src/component/"),
      components: path.resolve(__dirname, "src/components/"),
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  devtool: "source-map",
  devServer: {
    allowedHosts: "all",
    static: {
      directory: path.join(__dirname, "dist"),
    },
    // ...其他选项...
    port: 3000,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    open: true, // 自动打开浏览器
    hot: true, // 启用热模块替换
    historyApiFallback: {
      rewrites: [
        // 重定向规则
        { from: /^\/match3\.bundle\.js$/, to: "/match3.bundle.js" },
        { from: /^\/.*\.(js|css|png|jpg|jpeg|gif|svg)$/, to: (context) => context.parsedUrl.pathname },
        { from: /^\/$/, to: "/index.html" },
        // 你可以添加更多的重定向规则
      ],
    },
    // setupMiddlewares: (middlewares, devServer) => {
    //   if (!devServer) {
    //     throw new Error("webpack-dev-server is not defined");
    //   }

    //   devServer.app.use((req, res, next) => {
    //     const nonce = crypto.randomBytes(16).toString("base64");
    //     res.locals.nonce = nonce;
    //     res.setHeader(
    //       "Content-Security-Policy",
    //       `default-src 'self'; script-src 'self' https://trusted.cdn.com  'nonce-${nonce}' https://lenient-louse-86.clerk.accounts.dev; style-src 'self' 'unsafe-inline'  https://fonts.googleapis.com;font-src 'self' https://fonts.gstatic.com;img-src 'self' data: https://img.clerk.com;; connect-src 'self' wss://dazzling-setter-839.convex.cloud https://discord.com https://canary.discord.com https://ptb.discord.com https://cdn.discordapp.com https://media.discordapp.net wss://1252780878078152844.discordsays.com  https://lenient-louse-86.clerk.accounts.dev wss://fungift.fungift.org:3000/ws wss://dazzling-setter-839.convex.cloud data: blob: wss://dazzling-setter-839.convex.cloud; worker-src 'self' https://fungift.fungift.org;`
    //     );
    //     next();
    //   });

    //   return middlewares;
    // },
  },
};
