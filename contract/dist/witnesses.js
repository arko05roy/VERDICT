export const witnesses = {
    getPrevPrevPos(ctx) {
        return [ctx.privateState, [...ctx.privateState.prevPrevPos]];
    },
    getPrevPos(ctx) {
        return [ctx.privateState, [...ctx.privateState.prevPos]];
    },
    getCurrPos(ctx) {
        return [ctx.privateState, [...ctx.privateState.currPos]];
    },
    getAction(ctx) {
        return [ctx.privateState, ctx.privateState.action];
    },
    getIsFirstMove(ctx) {
        return [ctx.privateState, ctx.privateState.isFirstMove];
    },
    getPrevHash(ctx) {
        return [ctx.privateState, ctx.privateState.prevHash];
    },
    getNonce(ctx) {
        return [ctx.privateState, ctx.privateState.nonce];
    },
    getAimHistory(ctx) {
        return [ctx.privateState, ctx.privateState.aimHistory];
    },
    getActionHistory(ctx) {
        return [ctx.privateState, ctx.privateState.actionHistory];
    },
    getTickHistory(ctx) {
        return [ctx.privateState, ctx.privateState.tickHistory];
    },
    getCurrentTick(ctx) {
        return [ctx.privateState, ctx.privateState.currentTick];
    },
    getEnemyPositions(ctx) {
        return [ctx.privateState, ctx.privateState.enemyPositions];
    },
};
//# sourceMappingURL=witnesses.js.map