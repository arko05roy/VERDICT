"use client";

import { useState } from "react";
import StakingDashboard from "@/components/StakingDashboard";
import {
  connectWallet,
  getConnection,
  stakeTokens,
  recordStakedGame,
  getLedgerState,
} from "@/lib/midnight";
import { parsePGN } from "@/lib/replay-parser";
import type { MidnightConnection, StakeInfo } from "@/lib/midnight";

export default function StakingPage() {
  const [stakeInput, setStakeInput] = useState("100");
  const [stakedAmount, setStakedAmount] = useState(0);
  const [gamesVerified, setGamesVerified] = useState(0);
  const [gamesRequired] = useState(10);
  const [earnedYield, setEarnedYield] = useState(0);
  const [status, setStatus] = useState<"idle" | "staked" | "verifying" | "complete" | "slashed">("idle");
  const [walletConnected, setWalletConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastProofHash, setLastProofHash] = useState<string | null>(null);
  const [lastVerdict, setLastVerdict] = useState<string | null>(null);
  const [pgnInput, setPgnInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleConnectWallet = async () => {
    console.log("[staking] Connecting wallet...");
    setConnecting(true);
    try {
      const conn = await connectWallet("standalone");
      console.log("[staking] Wallet connected:", conn);
      setWalletConnected(true);
    } catch (err) {
      console.error("[staking] Wallet connection failed:", err);
    } finally {
      setConnecting(false);
    }
  };

  const handleStake = async () => {
    const amount = parseFloat(stakeInput);
    if (isNaN(amount) || amount <= 0) return;

    console.log("[staking] Staking", amount, "tDUST");
    try {
      const stakeInfo = await stakeTokens(BigInt(amount) * BigInt("1000000000000000"), 10);
      console.log("[staking] Stake created:", stakeInfo);

      setStakedAmount(amount);
      setGamesVerified(0);
      setEarnedYield(0);
      setStatus("verifying");
    } catch (err) {
      console.error("[staking] Stake failed:", err);
    }
  };

  const handleVerifyGame = async () => {
    if (status !== "verifying" && status !== "staked") return;
    if (!pgnInput.trim()) return;

    console.log("[staking] Verifying game through ZK circuit...");
    setLoading(true);
    setProgress("Parsing and verifying PGN through ZK circuit...");

    try {
      const replay = await parsePGN(pgnInput.trim(), undefined, (current, total) => {
        setProgress(`Verifying move ${current}/${total} through ZK circuit...`);
      });

      console.log("[staking] Game verified:", replay.zkProofs.length, "moves");

      // Determine overall verdict from the replay
      const flaggedCount = replay.results.filter(r => r.verdict === "flagged").length;
      const overallVerdict = flaggedCount > 0 ? "flagged" : "clean";
      const lastProof = replay.zkProofs[replay.zkProofs.length - 1];

      setLastProofHash(lastProof?.proofHash || null);
      setLastVerdict(overallVerdict);
      console.log("[staking] Overall verdict:", overallVerdict, "proof:", lastProof?.proofHash);

      // Record staked game
      const stakeInfo = await recordStakedGame(overallVerdict as "clean" | "flagged");
      console.log("[staking] Stake info after game:", stakeInfo);

      const newVerified = gamesVerified + 1;
      setGamesVerified(newVerified);

      if (stakeInfo.status === "slashed") {
        setStatus("slashed");
        setEarnedYield(-stakedAmount * 0.1);
        console.log("[staking] SLASHED!");
        setPgnInput("");
        return;
      }

      const yieldPerGame = stakedAmount * 0.005;
      setEarnedYield(earnedYield + yieldPerGame);

      if (stakeInfo.status === "completed" || newVerified >= gamesRequired) {
        setStatus("complete");
        console.log("[staking] Staking complete!");
      } else {
        setStatus("verifying");
      }

      setPgnInput("");
    } catch (err) {
      console.error("[staking] Verify game failed:", err);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleClaim = () => {
    if (status !== "complete") return;
    console.log("[staking] Claiming rewards, earned:", earnedYield);
    setStakedAmount(0);
    setGamesVerified(0);
    setEarnedYield(0);
    setStatus("idle");
    setStakeInput("100");
    setLastProofHash(null);
    setLastVerdict(null);
    setPgnInput("");
  };

  const conn = getConnection();
  const ledger = getLedgerState();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Clean Play Staking</h1>
        <p className="text-sm text-gray-400 mt-1">
          Stake tokens on your integrity. Play clean games to earn yield. Get caught cheating and get slashed.
        </p>
      </div>

      {/* Ledger State */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="text-xs text-gray-500">On-Chain Total Checks</div>
          <div className="text-lg font-bold text-cyan-400 font-mono">{ledger.totalChecks}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="text-xs text-gray-500">On-Chain Flagged</div>
          <div className="text-lg font-bold text-red-400 font-mono">{ledger.totalFlagged}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="text-xs text-gray-500">Connection</div>
          <div className={`text-sm font-bold ${conn.connected ? "text-emerald-400" : "text-gray-500"}`}>
            {conn.connected ? `${conn.network} [on-chain]` : "offline"}
          </div>
        </div>
      </div>

      {/* Connect wallet if needed */}
      {!walletConnected && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-yellow-400">Wallet Required</div>
            <div className="text-xs text-gray-400">Connect your wallet to stake tokens on the Midnight network.</div>
          </div>
          <button
            onClick={handleConnectWallet}
            disabled={connecting}
            className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      )}

      {/* Stake input */}
      {walletConnected && status === "idle" && (
        <div className="rounded-lg border border-gray-700/50 p-6 space-y-4">
          <div className="text-sm font-medium text-gray-300">Start a new stake</div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              placeholder="Amount to stake"
              className="w-48 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-cyan-400 font-mono focus:outline-none focus:border-cyan-500/50"
            />
            <span className="text-sm text-gray-500">tDUST</span>
            <button
              onClick={handleStake}
              className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition"
            >
              Stake
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Requires {gamesRequired} verified clean games to earn yield. 5% of stake slashed per flagged game.
          </div>
        </div>
      )}

      {/* Active staking dashboard */}
      {walletConnected && status !== "idle" && (
        <StakingDashboard
          stakedAmount={stakedAmount}
          gamesVerified={gamesVerified}
          gamesRequired={gamesRequired}
          earnedYield={earnedYield}
          status={status}
          onVerifyGame={handleVerifyGame}
          onClaim={handleClaim}
        />
      )}

      {/* PGN input for verification */}
      {walletConnected && (status === "verifying" || status === "staked") && (
        <div className="rounded-lg border border-gray-700/50 p-4 space-y-3">
          <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Verify a Game (paste PGN)</div>
          <textarea
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            placeholder="Paste PGN game log to verify through ZK circuit..."
            className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
          />
          <button
            onClick={handleVerifyGame}
            disabled={!pgnInput.trim() || loading}
            className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify Game"}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
          <div className="text-sm text-cyan-400 animate-pulse">{progress}</div>
        </div>
      )}

      {/* Last proof info */}
      {lastProofHash && (
        <div className="rounded-lg border border-gray-700/50 p-4 space-y-1">
          <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Last ZK Verification</div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              lastVerdict === "clean" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}>{lastVerdict?.toUpperCase()}</span>
            <span className="text-[10px] font-mono text-cyan-400 break-all">{lastProofHash}</span>
          </div>
        </div>
      )}

      {/* Slashed state */}
      {status === "slashed" && (
        <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4 space-y-2">
          <div className="text-sm font-bold text-red-400">STAKE SLASHED</div>
          <div className="text-xs text-gray-400">
            A flagged game was detected. 10% of your stake ({(stakedAmount * 0.1).toFixed(2)} tDUST) has been slashed.
            The remaining {(stakedAmount * 0.9).toFixed(2)} tDUST has been returned.
          </div>
          <button
            onClick={() => { setStatus("idle"); setStakedAmount(0); setGamesVerified(0); setEarnedYield(0); setLastProofHash(null); setLastVerdict(null); setPgnInput(""); }}
            className="px-4 py-1.5 rounded-lg border border-gray-700/50 text-gray-300 text-xs hover:text-white transition"
          >
            Start Over
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-lg border border-gray-700/50 p-4 space-y-3">
        <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">How It Works</div>
        <div className="grid grid-cols-4 gap-4 text-xs text-gray-400">
          <div className="space-y-1">
            <div className="text-cyan-400 font-bold text-lg">1</div>
            <div className="font-medium text-gray-300">Stake</div>
            <div>Deposit tDUST tokens as a clean-play bond</div>
          </div>
          <div className="space-y-1">
            <div className="text-cyan-400 font-bold text-lg">2</div>
            <div className="font-medium text-gray-300">Play</div>
            <div>Play {gamesRequired} games with VERDICT verification active</div>
          </div>
          <div className="space-y-1">
            <div className="text-cyan-400 font-bold text-lg">3</div>
            <div className="font-medium text-gray-300">Verify</div>
            <div>Paste PGN — each game passes through 10 ZK integrity checks</div>
          </div>
          <div className="space-y-1">
            <div className="text-cyan-400 font-bold text-lg">4</div>
            <div className="font-medium text-gray-300">Earn</div>
            <div>Clean games earn yield. Cheating means slashing.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
