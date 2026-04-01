const express = require("express");
const session = require("express-session");
const path = require("path"); 
require("dotenv").config();

const app = express();

// ✅ trust proxy (important for deployment)
app.set("trust proxy", 1);

// ✅ 1. PARSERS FIRST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 2. SESSION
app.use(session({
  secret: process.env.SESSION_SECRET || "super_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production"
  }

  
}));

// ✅ 3. STATIC
app.use(express.static(path.join(__dirname, "../public")));

// ✅ 4. ROUTES
app.use("/api/game", require("./routes/gameRoutes"));

// ✅ 5. ERROR HANDLER
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

module.exports = app;