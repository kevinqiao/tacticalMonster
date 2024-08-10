const express = require("express");
const path = require("path");
const app = express();
const port = 4000;
app.use(express.static("dist"));
// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });
app.get("/match3/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/match3/index.html"));
});
app.get("/tg/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/tg/index.html"));
});
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
