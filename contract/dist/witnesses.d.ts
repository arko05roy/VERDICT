import type { Witnesses } from "./managed/verdict/contract/index.js";
export type VerdictPrivateState = {
    prevPrevPos: [bigint, bigint];
    prevPos: [bigint, bigint];
    currPos: [bigint, bigint];
    action: bigint;
    isFirstMove: bigint;
    prevHash: Uint8Array;
    nonce: Uint8Array;
    aimHistory: bigint[];
    actionHistory: bigint[];
    tickHistory: bigint[];
    currentTick: bigint;
    enemyPositions: bigint[];
};
export declare const witnesses: Witnesses<VerdictPrivateState>;
