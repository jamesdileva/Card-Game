const express = require("express");
const app = require("./src/app"); // ✅ FIXED

app.use(express.static("public"));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});