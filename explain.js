const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  const { language, code, error, output } = req.body;
  if (!language || !code || !error)
    return res.status(400).json({ success: false, error: "language, code and error are required" });

  const prompt = `You are an expert ${language} programmer and teacher.

A student wrote this ${language} code:
\`\`\`${language}
${code}
\`\`\`

It produced this error:
\`\`\`
${error}
\`\`\`
${output ? `\nPartial output:\n\`\`\`\n${output}\n\`\`\`` : ""}

Please:
1. Explain the error in simple, friendly language (2-3 lines max)
2. Show the corrected code
3. Briefly explain what you fixed (1-2 lines)

Format EXACTLY like this:
❌ ERROR EXPLANATION:
[explanation]

✅ CORRECTED CODE:
\`\`\`${language}
[corrected code]
\`\`\`

🔧 WHAT I FIXED:
[what was fixed]`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "GEMINI_API_KEY missing in .env file" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ success: false, error: data.error?.message || "Gemini API error" });
    }

    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate explanation.";
    return res.json({ success: true, explanation });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to reach AI: " + err.message });
  }
});

module.exports = router;