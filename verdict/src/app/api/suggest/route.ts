import { NextRequest, NextResponse } from "next/server";
import { callGemini, SUGGEST_PROMPT } from "@/lib/gemini";
import { CHECK_REGISTRY } from "@/lib/checks/registry";

export async function POST(req: NextRequest) {
  const { description } = await req.json();

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "Description cannot be empty" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const checkList = CHECK_REGISTRY.map(
      (c) => `- ${c.id} (${c.mythName}): ${c.description}. Params: ${c.publicParams.map((p) => p.name).join(", ") || "none"}`
    ).join("\n");

    const userPrompt = `Available checks:\n${checkList}\n\nSystem description:\n${description}`;

    const raw = await callGemini(apiKey, SUGGEST_PROMPT, userPrompt);

    // Parse JSON from response (strip markdown fences if present)
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const suggestions = JSON.parse(cleaned);

    return NextResponse.json({ suggestions });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Suggestion failed" },
      { status: 500 }
    );
  }
}
