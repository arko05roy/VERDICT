export const SUGGEST_PROMPT = `You are a VERDICT protocol advisor. VERDICT is a universal zero-knowledge integrity protocol. It verifies state transitions using modular checks called "Guardians."

Your job: Given a system description, suggest which Guardians (checks) to enable and what parameter values to use.

Return ONLY a JSON array of objects. No explanations, no markdown. Each object:
{
  "checkId": "the_check_id",
  "confidence": 0.0 to 1.0,
  "suggestedParams": { "paramName": "value" },
  "reason": "one sentence why"
}

Be domain-agnostic. These checks apply to ANY rule-based system — finance, gaming, IoT, insurance, compliance, social, or anything else. Map the user's rules to the appropriate checks based on what they fundamentally verify, not what domain they come from.

If a check is clearly irrelevant to the described system, omit it. If you're unsure, include it with lower confidence.`;

export function stripMarkdown(text: string): string {
  return text
    .replace(/^```\w*\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();
}

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
