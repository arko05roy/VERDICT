# VERDICT

### *Every system that enforces rules asks you to trust it. We replace trust with proof.*

**Universal Zero-Knowledge Rule Enforcement Protocol on Midnight**

---

## The World Today

To prove you followed the rules, you must show everything.

Financial audits open your books. KYC hands over your identity. Anti-cheat scans your entire machine at kernel level. Platform integrity logs every action you take. Compliance in every industry works the same way: **surveillance in exchange for trust**.

170 million gamers have kernel-level anti-cheat watching their machines. Every regulated business opens its data to auditors. Every marketplace participant trusts the platform to be fair. The pattern is universal — and universally broken.

The cost of compliance is privacy. The cost of privacy is non-compliance. There has never been a third option.

---

## The Verification Trilemma

Any system with rules faces a fundamental problem:

```
        COMPLIANCE
           /\
          /  \
         /    \
        /      \
 PRIVACY ────── TRUST
```

**Pick two.** You've never been able to have all three.

- **Compliance + Trust, no privacy** — Today's world. You prove you followed the rules by exposing everything to a verifier you trust.
- **Compliance + Privacy, no trust** — You prove compliance without revealing data. But who checks? A server you must trust. Defeating the point.
- **Privacy + Trust, no compliance** — The honor system. Nobody actually checks. Fraud, cheating, and manipulation run free.

**VERDICT resolves the trilemma.** Zero-knowledge proofs give you compliance + privacy. A blockchain gives you trustless verification. All three. Simultaneously. For any rule-based system.

---

## What Is VERDICT?

VERDICT is a **protocol for universal rule enforcement**.

Any system with rules — games, financial platforms, supply chains, governance, marketplaces — can deploy a ruleset. VERDICT proves every state transition follows those rules, without revealing the underlying data.

The verifier learns exactly one thing: **VALID** or **FLAGGED**. Nothing else. Not the data, not the strategy, not the identity. Just whether the rules were followed.

### How It Works

1. **Define rules** — Write what constitutes valid behavior, in plain English
2. **Deploy** — Rules compile into a zero-knowledge circuit and deploy on-chain
3. **Verify** — Participants submit state transitions; the circuit proves compliance privately
4. **Settle** — Cryptographic proof lands on Midnight; anyone can audit the verdict, nobody can see the data

The system being verified never pauses. Proof generation runs in the background. Settlement is asynchronous. Violations are flagged retroactively — but the proof is cryptographically undeniable and permanently on-chain.

### Where This Applies

VERDICT is domain-agnostic. Any system where participants must follow rules but shouldn't have to expose their data:

| Domain | What Gets Verified | What Stays Private |
|--------|-------------------|-------------------|
| **Gaming** | State transitions follow physics and game rules | Player positions, strategies, inputs |
| **Financial compliance** | Transactions stay within regulatory bounds | Account balances, counterparties, amounts |
| **Supply chain** | Goods moved through valid checkpoints in order | Supplier identities, pricing, routes |
| **Voting & governance** | Votes cast within eligibility rules | Who voted for what |
| **Marketplace integrity** | Bids and listings follow platform rules | Bidder identity, amounts, strategy |
| **IoT & sensor networks** | Readings fall within valid ranges and sequences | Raw sensor data, device locations |

The reference implementation uses gaming — the most adversarial rule-enforcement environment there is. If VERDICT can catch aimbots and wallhacks without seeing the game, it can verify anything.

---

## The 10 Checks

Every state transition runs through 10 layered integrity checks. Each targets a different class of rule violation. All run simultaneously inside a single zero-knowledge proof.

| # | Check | What It Catches |
|---|-------|-----------------|
| 1 | **Sequence Integrity** | Fabricated states, replayed data, skipped transitions |
| 2 | **Pre-Commitment Binding** | Retroactive data editing, after-the-fact manipulation |
| 3 | **Rate-of-Change Bounds** | Impossible state jumps — values that change too fast |
| 4 | **Second-Order Rate Bounds** | Gradual ramps that individually look fine but collectively are impossible |
| 5 | **Range Enforcement** | Values outside permitted boundaries |
| 6 | **Action Whitelist** | Operations that don't exist in the ruleset |
| 7 | **Frequency Limiting** | Automated flooding, bot-speed operations |
| 8 | **Behavioral Entropy** | Bot-like repetition, scripted automation loops |
| 9 | **Precision Anomaly** | Mechanically perfect inputs no human could produce |
| 10 | **Information Leakage** | Acting on data the participant shouldn't have access to |

Four violation classes:

- **Fabrication** (1-2) — *Was this state transition real, or was it injected?*
- **Constraint Violations** (3-5) — *Does this transition stay within defined bounds?*
- **Automation** (6-8) — *Is this a legitimate participant or a bot?*
- **Information Asymmetry** (9-10) — *Is the participant acting on hidden information?*

---

## The SDK

Two lines to integrate. Any system. Any language.

```typescript
import { Verdict } from "verdict-sdk";

const verdict = new Verdict("mid1_your_ruleset_address");
const result = await verdict.verify({
  prevState: previousState,
  currState: currentState,
  action: actionPerformed,
});

// result.verdict → "VALID" or "FLAGGED"
// result.details → per-check breakdown
```

Also available in Python, Rust, and Go. The SDK handles proof generation, on-chain settlement, and returns a cryptographically verified verdict. Your application never touches the blockchain directly.

---

## The Dashboard

VERDICT ships with a protocol dashboard — not a demo.

**Deploy** — Write enforcement rules in plain English. They compile into a zero-knowledge circuit and deploy on-chain. You get back a contract address and a SDK snippet. No ZK knowledge required.

**Explore** — Browse every deployed ruleset on the network. See live verification feeds, flagged rates, and stats for any ruleset.

**Integrate** — Pick a ruleset, pick a language, copy the snippet. Four steps: Capture, Submit, Prove, Settle.

**Overview** — Real-time protocol health. Rulesets deployed, verifications flowing, proofs settling.

---

## Why Midnight?

VERDICT needs a chain where privacy is native, not bolted on.

Midnight's dual-ledger model keeps aggregate verdicts public (anyone can audit) while all participant data stays private (only the prover ever sees it). The ZK circuit bridges the two: takes private inputs, produces public outputs, proves the relationship without revealing anything.

Remove Midnight and you're back to trusting a centralized verifier — which is the problem VERDICT exists to solve.

---

## Running Locally

```bash
git clone <repo-url> && cd ratri
npm install
bash start.sh
```

This starts the local Midnight stack (node, indexer, proof server) and the dashboard on `localhost:3000`.

---

## The Hard Problems We Solved

### The Privacy Paradox

Rule enforcement traditionally works by *seeing everything*. Auditors see your books. Anti-cheat scans your machine. VERDICT works by *seeing nothing*.

How do you detect that someone is acting on hidden information — when you don't have access to the hidden information either? How do you verify a state transition is valid without seeing the state?

The answer is mathematical: you don't need to see the data to verify it follows the rules. You hash hidden state, verify the hash on-chain, and check for statistical correlation *inside* the zero-knowledge circuit. The verifier never learns what the data was. They only learn whether the rules were followed.

### Building on a Bleeding-Edge Chain

Midnight's Compact language is powerful but barely documented. The tooling is young. Version mismatches between proof server and runtime produce silent failures. The testnet faucet rejected valid addresses. Every discovery was hard-won — from integer underflow behavior to mandatory privacy-disclosure semantics for on-chain state.

We built a complete local simulator so the entire proof flow works end-to-end without depending on external infrastructure. The circuit compiles. All 10 checks pass. The protocol works.

### ZK Circuit Design Under Constraints

Zero-knowledge circuits can't do everything a normal program can. No square roots. No floating point. No dynamic loops. Every check in VERDICT had to be redesigned for finite field arithmetic — Manhattan distance instead of Euclidean, cross products instead of angles, squared comparisons instead of roots. The result: 10 checks in ~940 constraints. Lightweight enough for real-time settlement.

---

## Why This Matters

Every industry that enforces rules today faces the same trade-off: **compliance requires surveillance**. There has never been a way to prove you followed the rules without showing your hand.

VERDICT is that way. Deploy your rules. Let participants prove compliance without revealing their data. Settle the proof on-chain so no single party controls verification.

No surveillance. No data exposure. No trust required. Just a proof.

---

## Built For

**Midnight Assemble** — a builder program by the Midnight team.

VERDICT is infrastructure for a future where rule enforcement doesn't require surveillance.

---

*Built on Midnight. Proven in zero knowledge.*
