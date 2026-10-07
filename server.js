require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

const executeRoute = require("./routes/execute");
app.use("/api/execute", executeRoute);

const explainRoute = require("./routes/explain");
app.use("/api/explain", explainRoute);

app.get("/health", (_, res) =>
  res.json({ status: "ok", mode: "direct Docker (no queue)" })
);

// All other routes -> index.html
app.get("*", (_, res) =>
  res.sendFile(path.join(__dirname, "../frontend/index.html"))
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`CODZ-Compiler running on http://localhost:${PORT}`)
);
