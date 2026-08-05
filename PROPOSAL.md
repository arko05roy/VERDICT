# VERDICT — Level 6 Product Proposal

## Product

VERDICT is a privacy-preserving integrity layer for systems that need to
verify rules without exposing the underlying state. A builder describes a
ruleset in VCL, selects mythological Guardians, and deploys an independent
Midnight Compact contract. Integrators receive a public `CLEAN` or `FLAGGED`
result while private witnesses remain private.

## MVP user journey

1. Open the [live Preprod dashboard](https://verdict-jade.vercel.app).
2. Connect Lace on Midnight Preprod.
3. Describe a ruleset and select Guardians.
4. Review the generated VCL and deterministic Compact compilation.
5. Deploy or open a ruleset, run a verification, and inspect the result.
6. Follow the [integration guide](docs/integration-guide.md) to connect an app
   through the SDK.

## Why it matters

Teams repeatedly implement and audit integrity checks for games, compliance,
markets, and other stateful systems. VERDICT makes those checks reusable and
verifiable while keeping sensitive state out of the public result.

## Scope and safety boundary

- AI may suggest Guardians; it never writes Compact code.
- VCL compilation is deterministic and reviewable.
- Each ruleset is an independent contract with only its selected Guardians.
- This Preprod release is an MVP for evaluation, not a production security
  or compliance certification.

## Level 6 change target

The Supermoon cycle focuses on onboarding, not a new product branch. The
feedback loop in [`FEEDBACK.md`](FEEDBACK.md) records the friction signals,
the corresponding product or documentation response, and the next validation
step. Cohort funding evidence is in [`USERS.md`](USERS.md), with the first 20
launch addresses broken out in [`LAUNCH_USERS.md`](LAUNCH_USERS.md).

