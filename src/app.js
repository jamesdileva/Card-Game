const express = require("express");
const app = express();

app.use(express.json());
app.use("/api/game", require("./routes/gameRoutes"));



module.exports = app;
