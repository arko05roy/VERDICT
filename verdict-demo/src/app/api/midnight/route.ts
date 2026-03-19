import { NextRequest, NextResponse } from "next/server";
import * as midnight from "@/lib/midnight-server";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function err(message: string, status = 400) {
  console.error(`[api/midnight] ERROR: ${message}`);
  return json({ error: message }, status);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const action = body.action as string;
  console.log(`[api/midnight] POST action=${action}`);

  try {
    switch (action) {
      // ─── Connection ───
      case "connect": {
        const network = (body.network as string) || "standalone";
        const seed = body.seed as string | undefined;
        const result = await midnight.connect(network, seed);
        return json({ ok: true, ...result });
      }

      case "disconnect": {
        await midnight.disconnect();
        return json({ ok: true });
      }

      case "status": {
        return json({ ok: true, ...midnight.getStatus() });
      }

      // ─── Contract ───
      case "deploy": {
        const result = await midnight.deploy();
        return json({ ok: true, ...result });
      }

      case "join": {
        const addr = body.contractAddress as string;
        if (!addr) return err("Missing contractAddress");
        const result = await midnight.join(addr);
        return json({ ok: true, ...result });
      }

      // ─── Session ───
      case "startSession": {
        const result = await midnight.startSession();
        return json({ ok: true, ...result });
      }

      // ─── Commit + Verify ───
      case "commitMove": {
        const commitment = body.commitment as number[];
        if (!commitment) return err("Missing commitment");
        const result = await midnight.commitMove(new Uint8Array(commitment));
        return json({ ok: true, ...result });
      }

      case "verifyTransition": {
        const params = body.params as {
          maxVelocity: string;
          maxAcceleration: string;
          boundX: string;
          boundY: string;
          validActionCount: string;
          maxActionsPerWindow: string;
          windowSize: string;
          minDiversity: string;
          snapThreshold: string;
          maxSnaps: string;
          maxCorrelation: string;
          enemyPosHash: number[];
        };
        if (!params) return err("Missing params");
        const result = await midnight.verifyTransition(params);
        return json({ ok: true, ...result });
      }

      // ─── Private state update ───
      case "updatePrivateState": {
        const state = body.state as any;
        if (!state) return err("Missing state");
        // Convert arrays back to proper types
        const privateState = {
          prevPrevPos: [BigInt(state.prevPrevPos[0]), BigInt(state.prevPrevPos[1])] as [bigint, bigint],
          prevPos: [BigInt(state.prevPos[0]), BigInt(state.prevPos[1])] as [bigint, bigint],
          currPos: [BigInt(state.currPos[0]), BigInt(state.currPos[1])] as [bigint, bigint],
          action: BigInt(state.action),
          isFirstMove: BigInt(state.isFirstMove),
          prevHash: new Uint8Array(state.prevHash),
          nonce: new Uint8Array(state.nonce),
          aimHistory: (state.aimHistory as string[]).map((v: string) => BigInt(v)),
          actionHistory: (state.actionHistory as string[]).map((v: string) => BigInt(v)),
          tickHistory: (state.tickHistory as string[]).map((v: string) => BigInt(v)),
          currentTick: BigInt(state.currentTick),
          enemyPositions: (state.enemyPositions as string[]).map((v: string) => BigInt(v)),
        };
        await midnight.updatePrivateState(privateState);
        return json({ ok: true });
      }

      // ─── Ledger state ───
      case "readLedger": {
        const addr = body.contractAddress as string;
        if (!addr) return err("Missing contractAddress");
        const result = await midnight.readLedgerState(addr);
        return json({ ok: true, ledger: result });
      }

      // ─── Full round-trip: updateState → commit → verify → readLedger ───
      case "fullVerify": {
        const state = body.state as any;
        const params = body.params as any;
        if (!state || !params) return err("Missing state or params");

        // Auto-connect and deploy if not already set up
        const preStatus = midnight.getStatus();
        if (!preStatus.connected) {
          console.log("[api/midnight] Auto-connecting wallet (standalone)...");
          await midnight.connect("standalone");
        }
        if (!preStatus.hasContract) {
          console.log("[api/midnight] Auto-deploying contract...");
          await midnight.deploy();
          console.log("[api/midnight] Auto-starting session...");
          await midnight.startSession();
        }

        // 1. Update private state
        const privateState = {
          prevPrevPos: [BigInt(state.prevPrevPos[0]), BigInt(state.prevPrevPos[1])] as [bigint, bigint],
          prevPos: [BigInt(state.prevPos[0]), BigInt(state.prevPos[1])] as [bigint, bigint],
          currPos: [BigInt(state.currPos[0]), BigInt(state.currPos[1])] as [bigint, bigint],
          action: BigInt(state.action),
          isFirstMove: BigInt(state.isFirstMove),
          prevHash: new Uint8Array(state.prevHash || new Array(32).fill(0)),
          nonce: new Uint8Array(state.nonce || new Array(32).fill(0)),
          aimHistory: (state.aimHistory as string[]).map((v: string) => BigInt(v)),
          actionHistory: (state.actionHistory as string[]).map((v: string) => BigInt(v)),
          tickHistory: (state.tickHistory as string[]).map((v: string) => BigInt(v)),
          currentTick: BigInt(state.currentTick),
          enemyPositions: (state.enemyPositions as string[]).map((v: string) => BigInt(v)),
        };
        await midnight.updatePrivateState(privateState);

        // 2. Commit
        const commitment = new Uint8Array(32);
        const commitResult = await midnight.commitMove(commitment);

        // 3. Verify
        const verifyResult = await midnight.verifyTransition(params);

        // 4. Read ledger
        const status = midnight.getStatus();
        let ledgerState = null;
        if (status.contractAddress) {
          ledgerState = await midnight.readLedgerState(status.contractAddress);
        }

        return json({
          ok: true,
          commitTxHash: commitResult.txHash,
          verdict: verifyResult.verdict,
          verifyTxHash: verifyResult.txHash,
          ledger: ledgerState,
          onChain: true,
        });
      }

      default:
        return err(`Unknown action: ${action}`);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    const cause = e instanceof Error && (e as any).cause ? String((e as any).cause) : undefined;
    console.error(`[api/midnight] Action "${action}" failed:`, message);
    console.error(`[api/midnight] Stack:`, stack);
    console.error(`[api/midnight] Cause:`, cause);
    // Also log any nested cause chain
    let innerCause = (e as any)?.cause;
    while (innerCause) {
      console.error(`[api/midnight] Inner cause:`, innerCause instanceof Error ? innerCause.message : String(innerCause));
      innerCause = innerCause?.cause;
    }
    return json({ ok: false, error: `${message}`, cause, stack: stack?.slice(0, 500) }, 500);
  }
}

export async function GET() {
  const status = midnight.getStatus();
  return json({ ok: true, ...status });
}
