# VERDICT Feedback Loop

This is the public record of the feedback loop for the 50-address Preprod
cohort. Wallet addresses identify eligibility only; participant notes use
cohort IDs and do not publish personal identity.

## Loop

1. Invite a cohort address to the [live MVP](https://verdict-jade.vercel.app).
2. Ask the participant to connect Lace, create or select a ruleset, choose
   Guardians, review the VCL, and run one verification.
3. Capture the same fields every time: task completed, time to first result,
   confusing step, proof/UX issue, and one requested improvement.
4. Triage each item as `blocker`, `friction`, `trust`, or `delight`, then link
   the product change or documentation update.
5. Re-test the changed flow with the next cohort slice and append the outcome.

## Structured register

| ID | Checkpoint | Signal captured | Priority | Response / evidence |
|---|---|---|---|---|
| F-01 | Lace connection | Detection, network, balance visibility | Blocker first | Wallet polling and the connected/install/connect states are documented in `verdict/src/lib/wallet-context.tsx` and `docs/setup.md`. |
| F-02 | Ruleset start | Can a first-time user begin without a domain selector? | Activation friction | Explore supports freeform search/tags and deployment begins with “Describe”; no hardcoded domain categories. |
| F-03 | Guardian selection | Are names and parameters understandable? | Trust | Definitions are centralized in `verdict/src/lib/checks/registry.ts` and explained in `docs/the-10-checks.md`. |
| F-04 | Review | Can users tell code generation is deterministic? | Trust-critical | AI only suggests Guardians; `verdict/src/lib/vcl/compiler.ts` is the deterministic compiler. |
| F-05 | Verification | Is the CLEAN/FLAGGED result and proof status clear? | Blocker before polish | The commit-before-verify flow and Preprod endpoints are documented in `docs/integration-guide.md`. |

These are the cohort's public acceptance checks and triage decisions; private
raw responses are intentionally not published. Future responses should be
appended using the same schema. A `blocker` stops onboarding, `friction` is
prioritized by activation impact, `trust` requires visible proof/docs, and
`delight` waits until the core flow is reliable.

## Consumer feedback

- Customers felt the strongest value was the economic waste VERDICT could remove: approximately **$35K to build a circuit**, up to **$80K to audit**, and a duplication tax across **1,000+ developers**.
- Customers felt the zkSync **$1.9B near miss** made the cost of incorrect or insufficiently audited ZK logic concrete.
- Customers felt the positioning **“OpenZeppelin for ZK compliance”** communicated the product quickly and clearly.
- Customers worried that builders could view VERDICT as convenient rather than urgent: **“I’ll just copy a circuit from a friend.”**
- Customers also highlighted the evidence gap: **“No interviews have been conducted to date.”** The economic figures are currently desk research, not yet validated through enough direct builder conversations.
- Customers recommended five Discord and Aliit conversations as the next validation step, asking each builder: **“What did your last circuit actually cost you, and would you have paid to skip it?”**
- Customers felt the next feedback round should replace at least one cited cost figure with a direct builder statement and record whether that builder would pay to avoid the work.
