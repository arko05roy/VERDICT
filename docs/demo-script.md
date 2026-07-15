# VERDICT MVP Demo Script (under 3 minutes)

## 0:00–0:20 — Hook

“Most systems ask users to trust that hidden rules were followed. VERDICT turns
that trust into a public CLEAN or FLAGGED proof while keeping the underlying state
private.” Show the live dashboard.

## 0:20–0:40 — Product

Explain that a developer writes a ruleset in VCL, selects only the required
Guardians, and deploys a Midnight ZK verifier. The dashboard exposes Overview,
Deploy, Explore, DAO, and Integrate flows.

## 0:40–2:10 — MVP flow

1. Open Deploy and describe a rule-based system.
2. Choose Guardians and configure parameters.
3. Compile the VCL and show the generated Compact circuit preview.
4. Review and deploy/connect Lace on Preprod.
5. Open the ruleset in Explore and run verification.
6. Show the resulting CLEAN/FLAGGED verdict and counters; open the Midnight
   explorer for the public contract/transaction evidence.

If Preprod is unavailable during recording, use simulator mode and label the clip
“local simulator”; do not describe it as a live on-chain proof.

## 2:10–2:40 — Technical highlight

Show the deterministic VCL compiler and explain the boundary: Gemini may recommend
Guardians, but it never writes Compact. The selected pre-audited templates are the
only code-generation path.

## 2:40–3:00 — Close

“VERDICT is a universal privacy-preserving integrity layer for any state-transition
system. Try the live demo, read the integration guide, and inspect the contract
tests in the public repository.”
