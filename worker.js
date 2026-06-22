/**
 * Cloudflare Worker — nutrition proxy
 *
 * Deploy steps (one-time):
 *   1. npm install -g wrangler
 *   2. wrangler login
 *   3. wrangler deploy          (uses wrangler.toml in this folder)
 *   4. wrangler secret put ANTHROPIC_API_KEY   (paste your key when prompted)
 *   5. Copy the deployed URL into ANALYZE_URL in index.html
 *
 * The Worker accepts:  POST /  { image: "<base64>", mediaType: "image/jpeg" }
 * It returns:          { name, kcal, p, c, f }
 */

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    let body;
    try { body = await request.json(); }
    catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }

    const { image, mediaType = 'image/jpeg', description = '' } = body;
    if (!image) return new Response(JSON.stringify({ error: 'Missing image field' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image },
            },
            {
              type: 'text',
              text: `You are a nutrition estimator. Look at this food photo and return ONLY a JSON object with keys: name (short string), kcal, p, c, f (numbers, grams for macros). Estimate the portion shown.${description ? ` The user describes it as: "${description}".` : ''} No prose, no markdown, JSON only.`,
            },
          ],
        }],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI API error', detail }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiRes.json();
    const text = aiData.content?.[0]?.text ?? '';

    let macros;
    try {
      macros = JSON.parse((text.match(/\{[\s\S]*\}/) ?? [text])[0]);
    } catch {
      return new Response(JSON.stringify({ error: 'Could not parse AI response', raw: text }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(macros), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
