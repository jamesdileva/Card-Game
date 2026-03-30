const express = require("express");
const app = express();

app.use(express.json());
app.use("/api/game", require("./routes/gameRoutes"));

// test route
app.get("/", (req, res) => {
  res.send("API is running");
});

module.exports = app;