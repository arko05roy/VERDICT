"use client";

import { useState } from "react";
import { generateRulesFromText, RULE_PRESETS } from "@/lib/rule-generator";
import RuleEditor from "@/components/RuleEditor";
import type { GameRules } from "@/game/rules";
import Link from "next/link";
import { rulesToCircuitInputs } from "@/lib/midnight";

export default function RulesPage() {
  const [inputText, setInputText] = useState("");
  const [generatedRules, setGeneratedRules] = useState<GameRules | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [circuitInputs, setCircuitInputs] = useState<Record<string, bigint> | null>(null);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setIsGenerating(true);
    try {
      const rules = await generateRulesFromText(inputText);
      console.log("[rules] Generated rules:", rules);
      const inputs = rulesToCircuitInputs(rules);
      console.log("[rules] Circuit inputs:", inputs);
      setGeneratedRules(rules);
      setCircuitInputs(inputs as unknown as Record<string, bigint>);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadPreset = (preset: (typeof RULE_PRESETS)[number]) => {
    console.log("[rules] Loading preset:", preset.name);
    setGeneratedRules(preset.rules);
    setInputText(`Game type: ${preset.name}. ${preset.description}`);
    const inputs = rulesToCircuitInputs(preset.rules);
    console.log("[rules] Circuit inputs for preset:", inputs);
    setCircuitInputs(inputs as unknown as Record<string, bigint>);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">English to ZK Rules</h1>
        <p className="text-sm text-gray-400 mt-1">
          Describe your game rules in plain English and generate VERDICT-compatible constraint parameters.
        </p>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {RULE_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => loadPreset(preset)}
            className="px-3 py-1.5 rounded-lg border border-gray-700/50 bg-gray-800/50 text-xs text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400 transition"
          >
            {preset.name}
            <span className="text-gray-500 ml-1.5">{preset.description}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="space-y-3">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Describe your game rules in plain English... e.g. 'Chess on an 8x8 board with 6 piece types, max velocity 7, strict anti-engine checks'"
          className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !inputText.trim()}
          className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating..." : "Generate Rules"}
        </button>
      </div>

      {/* Generated rules */}
      {generatedRules && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-200">Generated Rules</h2>
            <Link
              href="/replay"
              className="px-4 py-1.5 rounded-lg border border-cyan-500/50 text-cyan-400 text-xs font-medium hover:bg-cyan-500/10 transition"
            >
              Test with these rules →
            </Link>
          </div>
          <RuleEditor
            rules={generatedRules}
            onChange={(r) => {
              setGeneratedRules(r);
              const inputs = rulesToCircuitInputs(r);
              console.log("[rules] Updated circuit inputs:", inputs);
              setCircuitInputs(inputs as unknown as Record<string, bigint>);
            }}
          />
        </div>
      )}

      {/* ZK Circuit Parameters */}
      {circuitInputs && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
          <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">ZK Circuit Parameters (BigInt Values)</div>
          <div className="text-xs text-gray-500 mb-2">These values are passed directly to the verdict.compact ZK circuit as public inputs.</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(circuitInputs).map(([key, value]) => (
              <div key={key} className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/30">
                <div className="text-[10px] text-gray-500">{key}</div>
                <div className="text-sm font-mono text-cyan-400">{String(value)}n</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
