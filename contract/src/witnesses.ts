import type { Witnesses, Ledger } from "./managed/verdict/contract/index.js";
import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type VerdictPrivateState = {
  prevPrevPos: [bigint, bigint];
  prevPos: [bigint, bigint];
  currPos: [bigint, bigint];
  action: bigint;
  isFirstMove: bigint;
  prevHash: Uint8Array;
  nonce: Uint8Array;
  aimHistory: bigint[];    // 16 values (8 x [x,y] flattened)
  actionHistory: bigint[]; // 8 values
  tickHistory: bigint[];   // 8 values
  currentTick: bigint;
  enemyPositions: bigint[]; // 16 values (8 x [x,y] flattened)
};

export const witnesses: Witnesses<VerdictPrivateState> = {
  getPrevPrevPos(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint[]] {
    return [ctx.privateState, [...ctx.privateState.prevPrevPos]];
  },
  getPrevPos(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint[]] {
    return [ctx.privateState, [...ctx.privateState.prevPos]];
  },
  getCurrPos(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint[]] {
    return [ctx.privateState, [...ctx.privateState.currPos]];
  },
  getAction(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint] {
    return [ctx.privateState, ctx.privateState.action];
  },
  getIsFirstMove(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint] {
    return [ctx.privateState, ctx.privateState.isFirstMove];
  },
  getPrevHash(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, Uint8Array] {
    return [ctx.privateState, ctx.privateState.prevHash];
  },
  getNonce(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, Uint8Array] {
    return [ctx.privateState, ctx.privateState.nonce];
  },
  getAimHistory(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint[]] {
    return [ctx.privateState, ctx.privateState.aimHistory];
  },
  getActionHistory(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint[]] {
    return [ctx.privateState, ctx.privateState.actionHistory];
  },
  getTickHistory(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint[]] {
    return [ctx.privateState, ctx.privateState.tickHistory];
  },
  getCurrentTick(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint] {
    return [ctx.privateState, ctx.privateState.currentTick];
  },
  getEnemyPositions(ctx: WitnessContext<Ledger, VerdictPrivateState>): [VerdictPrivateState, bigint[]] {
    return [ctx.privateState, ctx.privateState.enemyPositions];
  },
};
