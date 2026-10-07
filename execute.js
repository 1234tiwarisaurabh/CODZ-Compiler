const express = require("express");
const router = express.Router();
const { executeCode } = require("../executor");

router.post("/", async (req, res) => {
  const { language, code, stdin = "" } = req.body;
  if (!language || !code)
    return res.status(400).json({ success: false, error: "language and code are required" });

  try {
    const result = await executeCode(language, code, stdin);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

