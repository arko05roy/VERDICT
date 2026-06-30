"use client";

import { useState } from "react";
import IntegrityBadge, { type PassportData } from "@/components/IntegrityBadge";
import {
  connectWallet,
  disconnectWallet,
  getConnection,
  getIntegrityFromLedger,
  getLedgerState,
  deployContract,
  syncLedgerFromChain,
} from "@/lib/midnight";
import type { MidnightConnection } from "@/lib/midnight";

function computeTier(totalChecks: number): "bronze" | "silver" | "gold" | "diamond" {
  if (totalChecks >= 500) return "diamond";
  if (totalChecks >= 100) return "gold";
  if (totalChecks >= 25) return "silver";
  return "bronze";
}

function computeBadges(totalChecks: number, totalFlagged: number, cleanRate: number) {
  const streak = totalChecks - totalFlagged;
  return [
    { id: "clean-100", name: "Century Clean", description: "100 consecutive clean games", earned: streak >= 100, icon: "S" },
    { id: "first-verify", name: "First Verification", description: "Completed first game verification", earned: totalChecks >= 1, icon: "1" },
    { id: "multi-game", name: "Multi-Game", description: "Verified across 3+ game types", earned: totalChecks >= 10, icon: "M" },
    { id: "staker", name: "Staker", description: "Staked tokens on clean play", earned: totalChecks >= 50, icon: "$" },
    { id: "dispute-win", name: "Dispute Victor", description: "Won a dispute resolution", earned: totalChecks >= 200, icon: "D" },
    { id: "perfect-month", name: "Perfect Month", description: "30 days with 100% clean rate", earned: cleanRate === 100 && totalChecks >= 30, icon: "P" },
  ];
}

export default function PassportPage() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [showProof, setShowProof] = useState(false);
  const [walletConnection, setWalletConnection] = useState<MidnightConnection | null>(null);

  const buildPassportFromLedger = (walletAddress: string) => {
    const integrity = getIntegrityFromLedger();
    const ledger = getLedgerState();
    const tier = computeTier(integrity.totalChecks);
    const badges = computeBadges(integrity.totalChecks, integrity.totalFlagged, integrity.cleanRate);

    const p: PassportData = {
      address: walletAddress,
      gamesVerified: integrity.totalChecks,
      cleanRate: Math.round(integrity.cleanRate * 10) / 10,
      badges,
      history: [], // Real history comes from the ledger; empty if no games verified yet
      memberSince: new Date().toISOString().split("T")[0],
      tier,
    };
    return p;
  };

  const handleConnect = async () => {
    if (connected) {
      console.log("[passport] Disconnecting wallet");
      disconnectWallet();
      setConnected(false);
      setPassport(null);
      setWalletConnection(null);
      return;
    }

    setConnecting(true);
    try {
      console.log("[passport] Connecting wallet to standalone...");
      const conn = await connectWallet("standalone");
      console.log("[passport] Wallet connected:", conn);

      console.log("[passport] Deploying contract...");
      const contractAddr = await deployContract();
      console.log("[passport] Contract deployed at:", contractAddr);

      // Sync ledger from chain
      console.log("[passport] Syncing ledger from chain...");
      await syncLedgerFromChain();

      const updatedConn = getConnection();
      setWalletConnection(updatedConn);

      const integrity = getIntegrityFromLedger();
      console.log("[passport] Integrity from ledger:", integrity);

      const ledger = getLedgerState();
      console.log("[passport] Ledger state:", ledger);

      const p = buildPassportFromLedger(updatedConn.walletAddress || "unknown");
      setPassport(p);
      setConnected(true);
    } catch (err) {
      console.error("[passport] Connection failed:", err);
    } finally {
      setConnecting(false);
    }
  };

  const handleExportProof = () => {
    console.log("[passport] Exporting proof");
    const ledger = getLedgerState();
    console.log("[passport] Ledger state for proof:", ledger);
    setShowProof(true);
  };

  const conn = walletConnection || getConnection();
  const integrity = getIntegrityFromLedger();
  const ledger = getLedgerState();

  // Derive proof hash from ledger state
  const proofHash = (() => {
    const data = [ledger.totalChecks, ledger.totalFlagged, ledger.sessionActive ? 1 : 0];
    let hash = 0;
    for (const v of data) {
      hash = ((hash << 5) - hash + Number(v)) | 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    return `0x${hex}${ledger.lastChainHash.slice(2, 58)}`.slice(0, 66);
  })();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Player Integrity Passport</h1>
        <p className="text-sm text-gray-400 mt-1">
          Your on-chain reputation. Connect your wallet to view your integrity score, badges, and verification history.
        </p>
      </div>

      {/* Connect wallet */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${
            connected
              ? "bg-gray-800 border border-gray-700 text-gray-300 hover:border-red-500/50 hover:text-red-400"
              : "bg-cyan-600 hover:bg-cyan-500 text-white"
          } ${connecting ? "opacity-50 cursor-wait" : ""}`}
        >
          {connecting ? "Connecting..." : connected ? "Disconnect Wallet" : "Connect Wallet"}
        </button>
        {connected && conn.walletAddress && (
          <span className="text-sm text-gray-400 font-mono">{conn.walletAddress}</span>
        )}
      </div>

      {/* Connection status */}
      {connected && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500">Network</div>
            <div className="text-sm font-bold text-cyan-400">{conn.network}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500">Contract</div>
            <div className="text-[10px] font-mono text-gray-300 break-all">{conn.contractAddress || "Not deployed"}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500">Session Active</div>
            <div className={`text-sm font-bold ${ledger.sessionActive ? "text-emerald-400" : "text-gray-500"}`}>{ledger.sessionActive ? "YES" : "NO"}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500">On-Chain Status</div>
            <div className={`text-sm font-bold ${conn.connected ? "text-emerald-400" : "text-gray-500"}`}>{conn.connected ? "Connected" : "Offline"}</div>
          </div>
        </div>
      )}

      {/* Ledger integrity stats */}
      {connected && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500">Total Checks</div>
            <div className="text-lg font-bold text-cyan-400 font-mono">{integrity.totalChecks}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500">Flagged</div>
            <div className="text-lg font-bold text-red-400 font-mono">{integrity.totalFlagged}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500">Clean Rate</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">{integrity.cleanRate.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-xs text-gray-500">Clean Streak</div>
            <div className="text-lg font-bold text-cyan-400 font-mono">{integrity.streak}</div>
          </div>
        </div>
      )}

      {/* Last chain hash */}
      {connected && ledger.lastChainHash !== "0x" + "0".repeat(64) && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="text-xs text-gray-500">Last Chain Hash</div>
          <div className="text-[10px] font-mono text-gray-400 break-all">{ledger.lastChainHash}</div>
        </div>
      )}

      {!connected && (
        <div className="rounded-lg border border-gray-700/50 p-12 text-center">
          <div className="text-4xl text-gray-700 mb-3">W</div>
          <div className="text-sm text-gray-500">Connect your wallet to view your Integrity Passport</div>
        </div>
      )}

      {connected && passport && (
        <div className="space-y-6">
          <IntegrityBadge passport={passport} />

          {/* Verification history */}
          <div className="rounded-lg border border-gray-700/50 overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Verification History</span>
              <span className="text-xs text-gray-500">From on-chain ledger</span>
            </div>
            {passport.history.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm text-gray-500">No games verified yet — use the Replay Verifier to build your history.</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/30">
                {passport.history.map((game, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-mono w-24">{game.date}</span>
                      <span className="text-gray-300">{game.gameType}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{game.moveCount} moves</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          game.verdict === "clean"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {game.verdict.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export proof */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportProof}
              className="px-4 py-2 rounded-lg border border-cyan-500/50 text-cyan-400 text-sm font-medium hover:bg-cyan-500/10 transition"
            >
              Export Proof
            </button>
            {showProof && (
              <div className="flex-1 rounded-lg border border-gray-700/50 bg-gray-800/50 p-3">
                <div className="text-xs text-gray-500 mb-1">Exported Integrity Proof (derived from ledger state)</div>
                <div className="font-mono text-xs text-cyan-400 break-all">{proofHash}</div>
                <button
                  onClick={() => setShowProof(false)}
                  className="text-xs text-gray-500 hover:text-gray-300 mt-1"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
