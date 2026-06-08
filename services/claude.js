// Scaffold for Claude (or other LLM) integration.
// Place your API key in environment variable CLAUDE_API_KEY or set via secure store.

const CLAUDE_API_URL = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/complete';
const API_KEY = process.env.CLAUDE_API_KEY || '';

if (!API_KEY) {
  console.warn('CLAUDE_API_KEY not set. Claude integration will be disabled until configured.');
}

async function sendMessage(prompt) {
  if (!API_KEY) throw new Error('CLAUDE_API_KEY not set');

  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      model: 'claude-1',
      prompt,
      max_tokens_to_sample: 1000
    })
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`Claude error ${res.status}: ${bodyText}`);
  }

  const json = await res.json();
  return json.completion || json.output || JSON.stringify(json);
}

module.exports = { sendMessage };
