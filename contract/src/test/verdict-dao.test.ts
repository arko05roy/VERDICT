import { VerdictDaoSimulator, type VerdictDaoPrivateState } from "./verdict-dao-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";

setNetworkId("undeployed");

// Helper: create a unique Bytes<32> filled with a single byte value
function makeHash(fill: number): Uint8Array {
  return new Uint8Array(32).fill(fill);
}

// Helper: create default private state
function makePrivateState(overrides: Partial<VerdictDaoPrivateState> = {}): VerdictDaoPrivateState {
  return {
    callerHash: makeHash(0x01),
    currentTick: 1000n,
    ...overrides,
  };
}

// Default vote threshold for most tests
const DEFAULT_THRESHOLD = 2n;

describe("VERDICT DAO governance contract", () => {

  // ═══════════════════════════════════════════════════════════
  // 1. INITIALIZATION
  // ═══════════════════════════════════════════════════════════
  it("constructor sets voteThreshold correctly", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), 3n);
    const ledger = sim.getLedger();
    expect(ledger.voteThreshold).toEqual(3n);
    expect(ledger.totalChecks).toEqual(0n);
    expect(ledger.totalProposals).toEqual(0n);
    expect(ledger.councilSize).toEqual(0n);
  });

  // ═══════════════════════════════════════════════════════════
  // 2. REGISTER COUNCIL MEMBER
  // ═══════════════════════════════════════════════════════════
  it("registerCouncilMember adds member and increments councilSize", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), DEFAULT_THRESHOLD);

    const memberHash = makeHash(0xAA);
    const ledger = sim.registerCouncilMember(memberHash);

    expect(ledger.councilSize).toEqual(1n);
  });

  it("registerCouncilMember adds multiple members", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(makeHash(0xAA));
    sim.registerCouncilMember(makeHash(0xBB));
    const ledger = sim.registerCouncilMember(makeHash(0xCC));

    expect(ledger.councilSize).toEqual(3n);
  });

  // ═══════════════════════════════════════════════════════════
  // 3. REGISTER GENESIS CHECK
  // ═══════════════════════════════════════════════════════════
  it("registerGenesisCheck adds check to registry and increments totalChecks", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), DEFAULT_THRESHOLD);

    const nameHash = makeHash(0x10);
    const categoryHash = makeHash(0x20);
    const templateHash = makeHash(0x30);

    const ledger = sim.registerGenesisCheck(1n, nameHash, categoryHash, templateHash);

    expect(ledger.totalChecks).toEqual(1n);
    expect(ledger.checkRegistry.member(1n)).toEqual(true);

    const entry = ledger.checkRegistry.lookup(1n);
    expect(entry.nameHash).toEqual(nameHash);
    expect(entry.categoryHash).toEqual(categoryHash);
    expect(entry.templateHash).toEqual(templateHash);
    expect(entry.active).toEqual(true);
    expect(entry.addedAt).toEqual(1000n);
  });

  // ═══════════════════════════════════════════════════════════
  // 4. PROPOSE CHECK
  // ═══════════════════════════════════════════════════════════
  it("proposeCheck creates a proposal and increments totalProposals", () => {
    const callerHash = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash }), DEFAULT_THRESHOLD);

    // Register caller as council member first
    sim.registerCouncilMember(callerHash);

    const templateHash = makeHash(0x40);
    const ledger = sim.proposeCheck(100n, templateHash);

    expect(ledger.totalProposals).toEqual(1n);
    expect(ledger.proposals.member(100n)).toEqual(true);

    const proposal = ledger.proposals.lookup(100n);
    expect(proposal.checkId).toEqual(100n);
    expect(proposal.templateHash).toEqual(templateHash);
    expect(proposal.proposerHash).toEqual(callerHash);
    expect(proposal.votesFor).toEqual(0n);
    expect(proposal.votesAgainst).toEqual(0n);
    expect(proposal.status).toEqual(0); // 0 = pending
    expect(proposal.createdAt).toEqual(1000n);
  });

  // ═══════════════════════════════════════════════════════════
  // 5. VOTE
  // ═══════════════════════════════════════════════════════════
  it("council member can vote FOR a proposal", () => {
    const memberHash = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: memberHash }), DEFAULT_THRESHOLD);

    // Setup: register council member and create proposal
    sim.registerCouncilMember(memberHash);
    const templateHash = makeHash(0x40);
    sim.proposeCheck(100n, templateHash);

    // Vote FOR
    const ledger = sim.vote(100n, true);

    const proposal = ledger.proposals.lookup(100n);
    expect(proposal.votesFor).toEqual(1n);
    expect(proposal.votesAgainst).toEqual(0n);
  });

  it("council member can vote AGAINST a proposal", () => {
    const memberHash = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: memberHash }), DEFAULT_THRESHOLD);

    // Setup: register council member and create proposal
    sim.registerCouncilMember(memberHash);
    const templateHash = makeHash(0x40);
    sim.proposeCheck(100n, templateHash);

    // Vote AGAINST
    const ledger = sim.vote(100n, false);

    const proposal = ledger.proposals.lookup(100n);
    expect(proposal.votesFor).toEqual(0n);
    expect(proposal.votesAgainst).toEqual(1n);
  });

  it("multiple council members can vote on a proposal", () => {
    const member1 = makeHash(0x01);
    const member2 = makeHash(0x02);
    const member3 = makeHash(0x03);
    const state = makePrivateState({ callerHash: member1 });
    const sim = new VerdictDaoSimulator(state, DEFAULT_THRESHOLD);

    // Register all council members
    sim.registerCouncilMember(member1);
    sim.registerCouncilMember(member2);
    sim.registerCouncilMember(member3);

    // Member1 proposes and votes
    const templateHash = makeHash(0x40);
    sim.proposeCheck(100n, templateHash);
    sim.vote(100n, true);

    // Member2 votes FOR
    sim.setPrivateState({ callerHash: member2, currentTick: 1001n });
    sim.vote(100n, true);

    // Member3 votes AGAINST
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

    // Register member1 and create proposal
    sim.registerCouncilMember(member1);
    sim.proposeCheck(100n, makeHash(0x40));

    // Switch to non-member and try to vote
    sim.setPrivateState({ callerHash: nonMember, currentTick: 1000n });

    expect(() => sim.vote(100n, true)).toThrow();
  });

  it("same member cannot vote twice on same proposal (assert fails)", () => {
    const member1 = makeHash(0x01);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), DEFAULT_THRESHOLD);

    sim.registerCouncilMember(member1);
    sim.proposeCheck(100n, makeHash(0x40));

    // First vote succeeds
    sim.vote(100n, true);

    // Second vote should fail
    expect(() => sim.vote(100n, true)).toThrow();
  });

  // ═══════════════════════════════════════════════════════════
  // 6. FINALIZE — ACCEPTED
  // ═══════════════════════════════════════════════════════════
  it("finalizeProposal accepts proposal when votesFor >= threshold and registers check", () => {
    const member1 = makeHash(0x01);
    const member2 = makeHash(0x02);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), DEFAULT_THRESHOLD);

    // Setup council
    sim.registerCouncilMember(member1);
    sim.registerCouncilMember(member2);

    // Create proposal
    const templateHash = makeHash(0x40);
    sim.proposeCheck(100n, templateHash);

    // Two votes FOR (meets threshold of 2)
    sim.vote(100n, true);
    sim.setPrivateState({ callerHash: member2, currentTick: 1001n });
    sim.vote(100n, true);

    // Finalize
    const nameHash = makeHash(0x50);
    const categoryHash = makeHash(0x60);
    const ledger = sim.finalizeProposal(100n, nameHash, categoryHash);

    // Proposal should be accepted (status = 1)
    const proposal = ledger.proposals.lookup(100n);
    expect(proposal.status).toEqual(1); // 1 = accepted

    // Check should be registered
    expect(ledger.totalChecks).toEqual(1n);
    expect(ledger.checkRegistry.member(100n)).toEqual(true);

    const entry = ledger.checkRegistry.lookup(100n);
    expect(entry.nameHash).toEqual(nameHash);
    expect(entry.categoryHash).toEqual(categoryHash);
    expect(entry.templateHash).toEqual(templateHash);
    expect(entry.active).toEqual(true);
  });

  // ═══════════════════════════════════════════════════════════
  // 7. FINALIZE — REJECTED
  // ═══════════════════════════════════════════════════════════
  it("finalizeProposal rejects proposal when votesFor < threshold", () => {
    const member1 = makeHash(0x01);
    const member2 = makeHash(0x02);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), DEFAULT_THRESHOLD);

    // Setup council
    sim.registerCouncilMember(member1);
    sim.registerCouncilMember(member2);

    // Create proposal
    const templateHash = makeHash(0x40);
    sim.proposeCheck(100n, templateHash);

    // Only 1 vote FOR (below threshold of 2)
    sim.vote(100n, true);
    sim.setPrivateState({ callerHash: member2, currentTick: 1001n });
    sim.vote(100n, false);

    // Finalize — should reject since votesFor (1) < threshold (2)
    const nameHash = makeHash(0x50);
    const categoryHash = makeHash(0x60);
    const ledger = sim.finalizeProposal(100n, nameHash, categoryHash);

    // Proposal should be rejected (status = 2)
    const proposal = ledger.proposals.lookup(100n);
    expect(proposal.status).toEqual(2); // 2 = rejected

    // No check should be registered
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

    // First finalize succeeds
    sim.finalizeProposal(100n, makeHash(0x50), makeHash(0x60));

    // Second finalize should fail (not pending anymore)
    expect(() => sim.finalizeProposal(100n, makeHash(0x50), makeHash(0x60))).toThrow();
  });

  // ═══════════════════════════════════════════════════════════
  // 8. MULTIPLE GENESIS CHECKS — 10 guardians
  // ═══════════════════════════════════════════════════════════
  it("registers 10 genesis checks (guardian set)", () => {
    const sim = new VerdictDaoSimulator(makePrivateState(), DEFAULT_THRESHOLD);

    for (let i = 1; i <= 10; i++) {
      const nameHash = makeHash(i);
      const categoryHash = makeHash(i + 100);
      const templateHash = makeHash(i + 200);
      sim.registerGenesisCheck(BigInt(i), nameHash, categoryHash, templateHash);
    }

    const ledger = sim.getLedger();
    expect(ledger.totalChecks).toEqual(10n);

    // Verify each check was registered correctly
    for (let i = 1; i <= 10; i++) {
      expect(ledger.checkRegistry.member(BigInt(i))).toEqual(true);

      const entry = ledger.checkRegistry.lookup(BigInt(i));
      expect(entry.nameHash).toEqual(makeHash(i));
      expect(entry.categoryHash).toEqual(makeHash(i + 100));
      expect(entry.templateHash).toEqual(makeHash(i + 200));
      expect(entry.active).toEqual(true);
      expect(entry.addedAt).toEqual(1000n);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // FULL GOVERNANCE FLOW
  // ═══════════════════════════════════════════════════════════
  it("full governance flow: register council, propose, vote, finalize", () => {
    const member1 = makeHash(0x01);
    const member2 = makeHash(0x02);
    const member3 = makeHash(0x03);
    const sim = new VerdictDaoSimulator(makePrivateState({ callerHash: member1 }), 2n);

    // 1. Register 3 council members
    sim.registerCouncilMember(member1);
    sim.registerCouncilMember(member2);
    sim.registerCouncilMember(member3);
    expect(sim.getLedger().councilSize).toEqual(3n);

    // 2. Register some genesis checks
    sim.registerGenesisCheck(1n, makeHash(0x10), makeHash(0x20), makeHash(0x30));
    sim.registerGenesisCheck(2n, makeHash(0x11), makeHash(0x21), makeHash(0x31));
    expect(sim.getLedger().totalChecks).toEqual(2n);

    // 3. Member1 proposes a new check
    const templateHash = makeHash(0x40);
    sim.proposeCheck(100n, templateHash);
    expect(sim.getLedger().totalProposals).toEqual(1n);

    // 4. Member1 votes FOR
    sim.vote(100n, true);

    // 5. Member2 votes FOR (reaches threshold of 2)
    sim.setPrivateState({ callerHash: member2, currentTick: 1001n });
    sim.vote(100n, true);

    // 6. Finalize — should accept
    const nameHash = makeHash(0x50);
    const categoryHash = makeHash(0x60);
    const ledger = sim.finalizeProposal(100n, nameHash, categoryHash);

    // Check results
    expect(ledger.totalChecks).toEqual(3n); // 2 genesis + 1 accepted
    expect(ledger.proposals.lookup(100n).status).toEqual(1); // accepted
    expect(ledger.checkRegistry.member(100n)).toEqual(true);
  });
});
