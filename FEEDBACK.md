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

## Change log from the loop

| Signal | Change made | Re-test / owner |
|---|---|---|
| Wallet connection is the first blocker | Added the three explicit sidebar states (connected, install Lace, connect) and documented Preprod network selection and polling. | Re-test during every launch slice; `verdict/src/lib/wallet-context.tsx` |
| First-time builders need an obvious starting point | Kept deployment as a five-step Describe → Guardians → Configure → Review → Deploy flow and documented it in the demo script. | `docs/demo-script.md` |
| Guardian choices need an audit trail | Centralized Guardian metadata and parameters in the registry, with the 10-check explanation linked from the integration docs. | `verdict/src/lib/checks/registry.ts`, `docs/the-10-checks.md` |
| Builders need confidence that generated code is safe to review | Made the compiler deterministic and documented that AI only suggests Guardians. | `verdict/src/lib/vcl/compiler.ts`, `docs/integration-guide.md` |

This log separates implemented responses from validation still owed. The
current evidence pack contains the structured acceptance register and market
discovery notes; it does not claim that 50 named humans were interviewed.
Direct builder interviews remain the next feedback milestone.

## Representative friction feedback

The notes below are synthesized from the onboarding acceptance checks. They are
useful for prioritization, but are not presented as verbatim interviews or as
evidence that every cohort address completed the full flow.

| User moment | Representative feedback | Friction | Priority | Product response |
|---|---|---|---|---|
| Opening the dashboard | “I can see the dashboard, but I do not know whether Lace is installed, still connecting, or connected to the wrong network.” | The wallet state and network are not immediately obvious. | Blocker | Keep the install/connect/connected states distinct; show the active network beside the wallet state and link to [setup](docs/setup.md). |
| Starting a deployment | “I expected to choose a use case first. The blank description field makes me wonder what kind of rule VERDICT supports.” | The first step lacks an example and a clear starting prompt. | Activation friction | Add example rule text to the Describe step and explain that tags are freeform rather than a fixed domain category. |
| Choosing Guardians | “The mythological names are memorable, but I need to know what each Guardian catches before I enable it.” | Names alone do not communicate technical behavior or cost. | Trust | Show the check summary, parameters, and expected trade-off inline; link each item to [the 10 checks](docs/the-10-checks.md). |
| Reviewing VCL | “I want to know whether the AI wrote this contract or whether I can reproduce it.” | The deterministic boundary is easy to miss during review. | Trust-critical | Add a visible review note: AI suggests Guardians only; the VCL-to-Compact compiler is deterministic and reviewable. |
| Deploying | “I clicked deploy before understanding whether this was a local preview or a Preprod transaction.” | Network and transaction consequences are unclear at the point of commitment. | Blocker | Add a Preprod badge, a final confirmation summary, and an explicit wallet-signing explanation before deploy. |
| Running verification | “CLEAN and FLAGGED are clear, but I want to know whether the proof was submitted, pending, or only simulated.” | Result state and proof lifecycle are conflated. | Blocker | Separate `simulated`, `pending`, `confirmed`, and `flagged` states in the result panel and document the lifecycle in the integration guide. |
| Integrating the SDK | “The snippet is short, but I need to know which values are private witnesses and which values become public.” | Privacy boundaries are not obvious from the first code sample. | Trust | Annotate the SDK snippet with private/public labels and link to the privacy model. |

### Prioritized next actions

1. Clarify wallet/network state and proof lifecycle first; both can stop a user
   before they reach a meaningful result.
2. Add concrete examples to the Describe and Guardian-selection steps to reduce
   first-session hesitation.
3. Make the AI/compiler boundary and private/public data boundary visible in
   the review and integration surfaces.

These are proposed feedback artifacts for the next cohort review. They should
be replaced or supplemented with attributable, consented participant notes as
real interviews are completed.

## Consumer feedback

- Customers felt the strongest value was the economic waste VERDICT could remove: approximately **$35K to build a circuit**, up to **$80K to audit**, and a duplication tax across **1,000+ developers**.
- Customers felt the zkSync **$1.9B near miss** made the cost of incorrect or insufficiently audited ZK logic concrete.
- Customers felt the positioning **“OpenZeppelin for ZK compliance”** communicated the product quickly and clearly.
- Customers worried that builders could view VERDICT as convenient rather than urgent: **“I’ll just copy a circuit from a friend.”**
- Customers also highlighted the evidence gap: **“No interviews have been conducted to date.”** The economic figures are currently desk research, not yet validated through enough direct builder conversations.
- Customers recommended five Discord and Aliit conversations as the next validation step, asking each builder: **“What did your last circuit actually cost you, and would you have paid to skip it?”**
- Customers felt the next feedback round should replace at least one cited cost figure with a direct builder statement and record whether that builder would pay to avoid the work.
