module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey || apiKey === "paste-your-key-here") {
    res.status(500).json({ error: "SARVAM_API_KEY is not configured on the server." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  const question = body.question || body.prompt || "Say hi in one sentence.";

  try {
    const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        model: "sarvam-105b-conversations",
        messages: [{ role: "user", content: String(question) }],
      }),
    });

    const data = await response.json().catch(function () { return {}; });
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
};
