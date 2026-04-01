import { VerdictDaoSimulator, type VerdictDaoPrivateState } from "./verdict-dao-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";

setNetworkId("undeployed");

function makeHash(fill: number): Uint8Array {
  return new Uint8Array(32).fill(fill);
}

function makePrivateState(overrides: Partial<VerdictDaoPrivateState> = {}): VerdictDaoPrivateState {
  return {
    callerHash: makeHash(0x01),
    currentTick: 1000n,
    ...overrides,
  };
}

const DEFAULT_THRESHOLD = 2n;

// Guardian mask for all 10 genesis guardians: bits 0-9 set = 0x3FF = 1023
const GENESIS_MASK = 1023n;

describe("VERDICT DAO governance contract", () => {

  // ═══════════════════════════════════════════════════════
  // 1. INITIALIZATION
  // ═══════════════════════════════════════════════════════
  it("constructor sets voteThreshold correctly", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), 3n);
    const ledger = sim.getLedger();
    expect(ledger.voteThreshold).toEqual(3n);
    expect(ledger.totalChecks).toEqual(0n);
    expect(ledger.totalProposals).toEqual(0n);
    expect(ledger.councilSize).toEqual(0n);
    expect(ledger.latestVerifierVersion).toEqual(0n);
    expect(ledger.totalVerifierVersions).toEqual(0n);
    expect(ledger.totalRulesets).toEqual(0n);
  });

  // ═══════════════════════════════════════════════════════
  // 2. REGISTER COUNCIL MEMBER
  // ═══════════════════════════════════════════════════════
  it("registerCouncilMember adds member and increments councilSize", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), DEFAULT_THRESHOLD);
    const ledger = sim.registerCouncilMember(makeHash(0xAA));
    expect(ledger.councilSize).toEqual(1n);
  });

  it("registerCouncilMember adds multiple members", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), DEFAULT_THRESHOLD);
    sim.registerCouncilMember(makeHash(0xAA));
    sim.registerCouncilMember(makeHash(0xBB));
    const ledger = sim.registerCouncilMember(makeHash(0xCC));
    expect(ledger.councilSize).toEqual(3n);
  });

  // ═══════════════════════════════════════════════════════
  // 3. REGISTER GENESIS CHECK
  // ═══════════════════════════════════════════════════════
  it("registerGenesisCheck adds check to registry and increments totalChecks", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), DEFAULT_THRESHOLD);
    const ledger = sim.registerGenesisCheck(1n, makeHash(0x10), makeHash(0x20), makeHash(0x30));

    expect(ledger.totalChecks).toEqual(1n);
    expect(ledger.checkRegistry.member(1n)).toEqual(true);

    const entry = ledger.checkRegistry.lookup(1n);
    expect(entry.nameHash).toEqual(makeHash(0x10));
    expect(entry.categoryHash).toEqual(makeHash(0x20));
    expect(entry.templateHash).toEqual(makeHash(0x30));
    expect(entry.active).toEqual(true);
    expect(entry.addedAt).toEqual(1000n);
  });

  // ═══════════════════════════════════════════════════════
  // 4. PROPOSE CHECK
  // ═══════════════════════════════════════════════════════
  it("proposeCheck creates a proposal and increments totalProposals", () => {
    const callerHash = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash }), DEFAULT_THRESHOLD);
    sim.registerCouncilMember(callerHash);

    const ledger = sim.proposeCheck(100n, makeHash(0x40));

    expect(ledger.totalProposals).toEqual(1n);
    expect(ledger.proposals.member(100n)).toEqual(true);

    const proposal = ledger.proposals.lookup(100n);
    expect(proposal.checkId).toEqual(100n);
    expect(proposal.templateHash).toEqual(makeHash(0x40));
    expect(proposal.proposerHash).toEqual(callerHash);
    expect(proposal.votesFor).toEqual(0n);
    expect(proposal.votesAgainst).toEqual(0n);
    expect(proposal.status).toEqual(0); // pending
    expect(proposal.createdAt).toEqual(1000n);
  });

  // ═══════════════════════════════════════════════════════
  // 5. VOTE
  // ═══════════════════════════════════════════════════════
  it("council member can vote FOR a proposal", () => {
    const memberHash = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: memberHash }), DEFAULT_THRESHOLD);
    sim.registerCouncilMember(memberHash);
    sim.proposeCheck(100n, makeHash(0x40));

    const ledger = sim.vote(100n, true);
    const proposal = ledger.proposals.lookup(100n);
    expect(proposal.votesFor).toEqual(1n);
    expect(proposal.votesAgainst).toEqual(0n);
  });

  it("council member can vote AGAINST a proposal", () => {
    const memberHash = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: memberHash }), DEFAULT_THRESHOLD);
    sim.registerCouncilMember(memberHash);
    sim.proposeCheck(100n, makeHash(0x40));

    const ledger = sim.vote(100n, false);
    const proposal = ledger.proposals.lookup(100n);
    expect(proposal.votesFor).toEqual(0n);
    expect(proposal.votesAgainst).toEqual(1n);
  });

  it("multiple council members can vote on a proposal", () => {
    const member1 = makeHash(0x01);
    const member2 = makeHash(0x02);
    const member3 = makeHash(0x03);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(member1);
    sim.registerCouncilMember(member2);
    sim.registerCouncilMember(member3);

    sim.proposeCheck(100n, makeHash(0x40));
    sim.vote(100n, true);

    sim.setPrivateState({ callerHash: member2, currentTick: 1001n });
    sim.vote(100n, true);

    sim.setPrivateState({ callerHash: member3, currentTick: 1002n });
    const ledger = sim.vote(100n, false);

    const proposal = ledger.proposals.lookup(100n);
    expect(proposal.votesFor).toEqual(2n);
    expect(proposal.votesAgainst).toEqual(1n);
  });

  it("non-council member cannot vote (assert fails)", () => {
    const member1 = makeHash(0x01);
    const nonMember = makeHash(0xFF);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(member1);
    sim.proposeCheck(100n, makeHash(0x40));

    sim.setPrivateState({ callerHash: nonMember, currentTick: 1000n });
    expect(() => sim.vote(100n, true)).toThrow();
  });

  it("same member cannot vote twice on same proposal (assert fails)", () => {
    const member1 = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(member1);
    sim.proposeCheck(100n, makeHash(0x40));
    sim.vote(100n, true);

    expect(() => sim.vote(100n, true)).toThrow();
  });

  // ═══════════════════════════════════════════════════════
  // 6. FINALIZE — ACCEPTED
  // ═══════════════════════════════════════════════════════
  it("finalizeProposal accepts proposal when votesFor >= threshold and registers check", () => {
    const member1 = makeHash(0x01);
    const member2 = makeHash(0x02);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(member1);
    sim.registerCouncilMember(member2);

    sim.proposeCheck(100n, makeHash(0x40));
    sim.vote(100n, true);
    sim.setPrivateState({ callerHash: member2, currentTick: 1001n });
    sim.vote(100n, true);

    const ledger = sim.finalizeProposal(100n, makeHash(0x50), makeHash(0x60));

    expect(ledger.proposals.lookup(100n).status).toEqual(1); // accepted
    expect(ledger.totalChecks).toEqual(1n);
    expect(ledger.checkRegistry.member(100n)).toEqual(true);

    const entry = ledger.checkRegistry.lookup(100n);
    expect(entry.nameHash).toEqual(makeHash(0x50));
    expect(entry.templateHash).toEqual(makeHash(0x40));
    expect(entry.active).toEqual(true);
  });

  // ═══════════════════════════════════════════════════════
  // 7. FINALIZE — REJECTED
  // ═══════════════════════════════════════════════════════
  it("finalizeProposal rejects proposal when votesFor < threshold", () => {
    const member1 = makeHash(0x01);
    const member2 = makeHash(0x02);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(member1);
    sim.registerCouncilMember(member2);

    sim.proposeCheck(100n, makeHash(0x40));
    sim.vote(100n, true);
    sim.setPrivateState({ callerHash: member2, currentTick: 1001n });
    sim.vote(100n, false);

    const ledger = sim.finalizeProposal(100n, makeHash(0x50), makeHash(0x60));

    expect(ledger.proposals.lookup(100n).status).toEqual(2); // rejected
    expect(ledger.totalChecks).toEqual(0n);
  });

  it("cannot finalize an already finalized proposal (assert fails)", () => {
    const member1 = makeHash(0x01);
    const member2 = makeHash(0x02);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(member1);
    sim.registerCouncilMember(member2);

    sim.proposeCheck(100n, makeHash(0x40));
    sim.vote(100n, true);
    sim.setPrivateState({ callerHash: member2, currentTick: 1001n });
    sim.vote(100n, true);
    sim.finalizeProposal(100n, makeHash(0x50), makeHash(0x60));

    expect(() => sim.finalizeProposal(100n, makeHash(0x50), makeHash(0x60))).toThrow();
  });

  // ═══════════════════════════════════════════════════════
  // 8. GENESIS CHECKS — 10 guardians
  // ═══════════════════════════════════════════════════════
  it("registers 10 genesis checks (guardian set)", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), DEFAULT_THRESHOLD);

    for (let i = 1; i <= 10; i++) {
      sim.registerGenesisCheck(BigInt(i), makeHash(i), makeHash(i + 100), makeHash(i + 200));
    }

    const ledger = sim.getLedger();
    expect(ledger.totalChecks).toEqual(10n);

    for (let i = 1; i <= 10; i++) {
      expect(ledger.checkRegistry.member(BigInt(i))).toEqual(true);
      const entry = ledger.checkRegistry.lookup(BigInt(i));
      expect(entry.nameHash).toEqual(makeHash(i));
      expect(entry.active).toEqual(true);
    }
  });

  // ═══════════════════════════════════════════════════════
  // 9. VERIFIER VERSION MANAGEMENT
  // ═══════════════════════════════════════════════════════
  it("registerGenesisVerifier creates v1.0 with all 10 guardians", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), DEFAULT_THRESHOLD);

    const ledger = sim.registerGenesisVerifier(
      1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB)
    );

    expect(ledger.totalVerifierVersions).toEqual(1n);
    expect(ledger.latestVerifierVersion).toEqual(1n);
    expect(ledger.verifierVersions.member(1n)).toEqual(true);

    const ver = ledger.verifierVersions.lookup(1n);
    expect(ver.versionId).toEqual(1n);
    expect(ver.guardianMask).toEqual(GENESIS_MASK);
    expect(ver.guardianCount).toEqual(10n);
    expect(ver.codeHash).toEqual(makeHash(0xAA));
    expect(ver.contractAddress).toEqual(makeHash(0xBB));
    expect(ver.active).toEqual(true);
    expect(ver.createdAt).toEqual(1000n);
  });

  it("registerVerifierVersion requires council membership", () => {
    const nonMember = makeHash(0xFF);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: nonMember }), DEFAULT_THRESHOLD);

    expect(() =>
      sim.registerVerifierVersion(2n, GENESIS_MASK, 10n, makeHash(0xCC), makeHash(0xDD))
    ).toThrow();
  });

  it("council member can register a new verifier version", () => {
    const member = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(member);
    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB));

    // New version with 11 guardians (bit 10 also set)
    const v2Mask = GENESIS_MASK + 1024n; // 0x7FF
    const ledger = sim.registerVerifierVersion(2n, v2Mask, 11n, makeHash(0xCC), makeHash(0xDD));

    expect(ledger.totalVerifierVersions).toEqual(2n);
    expect(ledger.latestVerifierVersion).toEqual(2n);

    const ver = ledger.verifierVersions.lookup(2n);
    expect(ver.guardianMask).toEqual(v2Mask);
    expect(ver.guardianCount).toEqual(11n);
    expect(ver.active).toEqual(true);
  });

  // ═══════════════════════════════════════════════════════
  // 10. RULESET MANAGEMENT
  // ═══════════════════════════════════════════════════════
  it("registerRuleset creates a lightweight ruleset pointing to verifier v1.0", () => {
    const owner = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB));

    // Enable only guardians 1-5 (bits 0-4 = 0x1F = 31)
    const enableMask = 31n;
    const ledger = sim.registerRuleset(1n, 1n, enableMask, makeHash(0xCC));

    expect(ledger.totalRulesets).toEqual(1n);
    expect(ledger.rulesets.member(1n)).toEqual(true);

    const rs = ledger.rulesets.lookup(1n);
    expect(rs.rulesetId).toEqual(1n);
    expect(rs.verifierVersion).toEqual(1n);
    expect(rs.enableMask).toEqual(enableMask);
    expect(rs.paramsHash).toEqual(makeHash(0xCC));
    expect(rs.ownerHash).toEqual(owner);
    expect(rs.active).toEqual(true);
  });

  it("registerRuleset fails if enableMask exceeds verifier guardianMask", () => {
    const owner = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    // Verifier v1.0 with only 3 guardians (mask = 0b111 = 7)
    sim.registerGenesisVerifier(1n, 7n, 3n, makeHash(0xAA), makeHash(0xBB));

    // Try to enable guardian 4 (bit 3 = 8) which exceeds mask
    expect(() => sim.registerRuleset(1n, 1n, 8n, makeHash(0xCC))).toThrow();
  });

  it("registerRuleset fails if verifier version does not exist", () => {
    const owner = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    // No verifier registered — should fail on lookup
    expect(() => sim.registerRuleset(1n, 99n, 1n, makeHash(0xCC))).toThrow();
  });

  it("multiple rulesets can reference the same verifier version", () => {
    const owner = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB));

    sim.registerRuleset(1n, 1n, 31n, makeHash(0xC1));   // checks 1-5
    sim.registerRuleset(2n, 1n, 992n, makeHash(0xC2));   // checks 6-10 (bits 5-9)
    const ledger = sim.registerRuleset(3n, 1n, GENESIS_MASK, makeHash(0xC3)); // all 10

    expect(ledger.totalRulesets).toEqual(3n);
    expect(ledger.rulesets.lookup(1n).enableMask).toEqual(31n);
    expect(ledger.rulesets.lookup(2n).enableMask).toEqual(992n);
    expect(ledger.rulesets.lookup(3n).enableMask).toEqual(GENESIS_MASK);
  });

  // ═══════════════════════════════════════════════════════
  // 11. RULESET MIGRATION
  // ═══════════════════════════════════════════════════════
  it("migrateRuleset moves ruleset to a newer verifier version", () => {
    const owner = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(owner);
    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB));
    sim.registerRuleset(1n, 1n, 31n, makeHash(0xCC));

    // Register v2 with more guardians
    const v2Mask = GENESIS_MASK + 1024n;
    sim.registerVerifierVersion(2n, v2Mask, 11n, makeHash(0xDD), makeHash(0xEE));

    // Migrate ruleset to v2
    const ledger = sim.migrateRuleset(1n, 2n);

    const rs = ledger.rulesets.lookup(1n);
    expect(rs.verifierVersion).toEqual(2n);
    expect(rs.enableMask).toEqual(31n); // mask unchanged
    expect(rs.active).toEqual(true);
  });

  it("migrateRuleset fails if caller is not owner", () => {
    const owner = makeHash(0x01);
    const notOwner = makeHash(0x02);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(owner);
    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB));
    sim.registerRuleset(1n, 1n, 31n, makeHash(0xCC));
    sim.registerVerifierVersion(2n, GENESIS_MASK + 1024n, 11n, makeHash(0xDD), makeHash(0xEE));

    sim.setPrivateState({ callerHash: notOwner, currentTick: 1001n });
    expect(() => sim.migrateRuleset(1n, 2n)).toThrow();
  });

  it("migrateRuleset fails if enableMask exceeds new verifier mask", () => {
    const owner = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(owner);
    // v1 has all 10 guardians
    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB));
    // Ruleset uses all 10
    sim.registerRuleset(1n, 1n, GENESIS_MASK, makeHash(0xCC));

    // v2 has only 5 guardians (downgrade scenario)
    sim.registerVerifierVersion(2n, 31n, 5n, makeHash(0xDD), makeHash(0xEE));

    // Can't migrate — ruleset needs 10 guardians, v2 only has 5
    expect(() => sim.migrateRuleset(1n, 2n)).toThrow();
  });

  // ═══════════════════════════════════════════════════════
  // 12. RULESET DEACTIVATION
  // ═══════════════════════════════════════════════════════
  it("deactivateRuleset marks ruleset as inactive", () => {
    const owner = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB));
    sim.registerRuleset(1n, 1n, 31n, makeHash(0xCC));

    const ledger = sim.deactivateRuleset(1n);
    const rs = ledger.rulesets.lookup(1n);
    expect(rs.active).toEqual(false);
  });

  it("deactivateRuleset fails if caller is not owner", () => {
    const owner = makeHash(0x01);
    const notOwner = makeHash(0x02);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB));
    sim.registerRuleset(1n, 1n, 31n, makeHash(0xCC));

    sim.setPrivateState({ callerHash: notOwner, currentTick: 1001n });
    expect(() => sim.deactivateRuleset(1n)).toThrow();
  });

  it("deactivateRuleset fails if already inactive", () => {
    const owner = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: owner }), DEFAULT_THRESHOLD);

    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xAA), makeHash(0xBB));
    sim.registerRuleset(1n, 1n, 31n, makeHash(0xCC));
    sim.deactivateRuleset(1n);

    expect(() => sim.deactivateRuleset(1n)).toThrow();
  });

  // ═══════════════════════════════════════════════════════
  // 13. FULL GOVERNANCE FLOW (end-to-end)
  // ═══════════════════════════════════════════════════════
  it("full flow: council → genesis checks → genesis verifier → propose check → vote → finalize → register ruleset → migrate", () => {
    const member1 = makeHash(0x01);
    const member2 = makeHash(0x02);
    const member3 = makeHash(0x03);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), 2n);

    // 1. Register council
    sim.registerCouncilMember(member1);
    sim.registerCouncilMember(member2);
    sim.registerCouncilMember(member3);
    expect(sim.getLedger().councilSize).toEqual(3n);

    // 2. Register genesis checks
    for (let i = 1; i <= 10; i++) {
      sim.registerGenesisCheck(BigInt(i), makeHash(i), makeHash(i + 100), makeHash(i + 200));
    }
    expect(sim.getLedger().totalChecks).toEqual(10n);

    // 3. Register genesis verifier v1.0
    sim.registerGenesisVerifier(1n, GENESIS_MASK, 10n, makeHash(0xF0), makeHash(0xF1));
    expect(sim.getLedger().latestVerifierVersion).toEqual(1n);

    // 4. Deploy a ruleset
    sim.registerRuleset(1n, 1n, GENESIS_MASK, makeHash(0xD0));
    expect(sim.getLedger().totalRulesets).toEqual(1n);

    // 5. Propose guardian XI
    sim.proposeCheck(11n, makeHash(0x40));

    // 6. Vote (member1 + member2 = meets threshold)
    sim.vote(11n, true);
    sim.setPrivateState({ callerHash: member2, currentTick: 1001n });
    sim.vote(11n, true);

    // 7. Finalize — accepted
    sim.finalizeProposal(11n, makeHash(0x50), makeHash(0x60));
    expect(sim.getLedger().totalChecks).toEqual(11n);

    // 8. Register verifier v2.0 with guardian XI
    const v2Mask = GENESIS_MASK + 1024n; // bit 10 set
    sim.registerVerifierVersion(2n, v2Mask, 11n, makeHash(0xF2), makeHash(0xF3));
    expect(sim.getLedger().latestVerifierVersion).toEqual(2n);

    // 9. Migrate ruleset to v2.0
    sim.setPrivateState({ callerHash: member1, currentTick: 1002n });
    const ledger = sim.migrateRuleset(1n, 2n);

    const rs = ledger.rulesets.lookup(1n);
    expect(rs.verifierVersion).toEqual(2n);
    expect(rs.active).toEqual(true);
  });
});
