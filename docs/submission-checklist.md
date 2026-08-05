# VERDICT Submission Checklist

This page is the single source of truth for the submission. Statuses are based on
repository evidence and live checks; no deployment or social profile is claimed
without a public link.

## Level 6 / Supermoon evidence

| Requirement | Evidence |
|---|---|
| 50 verifiable Preprod cohort addresses | [USERS.md](../USERS.md) lists all 50 unique addresses and the funding transaction/block evidence. |
| 20 launch-user addresses | [LAUNCH_USERS.md](../LAUNCH_USERS.md) lists the first 20 addresses as a launch subset and links to the shared funding evidence. |
| Feedback loop documented | [FEEDBACK.md](../FEEDBACK.md) defines structured intake, triage, implemented responses, and the next validation step. |
| Product proposal | [PROPOSAL.md](../PROPOSAL.md) describes the MVP user journey, scope, and Level 6 focus. |
| Updated documentation | [docs/README.md](README.md) indexes setup, usage, integration, checks, demo, proposal, and evidence. |
| Minimum 20 meaningful commits | `git rev-list --count HEAD` reports 64 commits in this repository. |

| Requirement | Status | Evidence / final action |
|---|---|---|
| Working MVP live on Preprod | ⏳ Blocked | Live dashboard: [verdict-jade.vercel.app](https://verdict-jade.vercel.app). The current wallet deploy attempt was blocked by the Preprod RPC runtime-version sync loop. Retry `SEED=<funded-hex-seed> npm run deploy:preprod`. |
| Verifiable contract address | ⏳ Required | Add the successful deployment address and explorer URL below. |
| README documentation | ✅ Done | [README.md](../README.md) includes product, architecture, setup, usage, demo, CI, and status. |
| Setup documentation | ✅ Done | [docs/setup.md](setup.md) |
| Usage/integration documentation | ✅ Done | [docs/integration-guide.md](integration-guide.md) and [verdict/sdk](../verdict/sdk) |
| CI/CD workflow | ✅ Done | [.github/workflows/ci.yml](../.github/workflows/ci.yml) and the [CI badge](https://github.com/arko05roy/VERDICT/actions/workflows/ci.yml) |
| Public GitHub repository | ✅ Done | [github.com/arko05roy/VERDICT](https://github.com/arko05roy/VERDICT) |
| Product X profile | ⏳ Required | Create the product profile, then replace `X_PROFILE_URL` below and in the final submission form. |
| Demo video | ✅ Repo link present | [YouTube demo](https://youtu.be/O64oQYzj__o); re-record if it does not show the final Preprod address. |
| Minimum 15 meaningful commits | ✅ Done | 64 commits on `main` at audit time (`git rev-list --count HEAD`). |

## Final deployment evidence

Fill these two fields only from `counter-cli/logs/preprod-deploy.json` after a
successful deployment:

- Contract address: `PENDING_PREPROD_DEPLOYMENT`
- Explorer: `PENDING_PREPROD_DEPLOYMENT`

## Product profile

- X profile: `X_PROFILE_URL`

## Final pre-submit verification

```bash
git rev-list --count HEAD                  # must be >= 15
npm test                                   # must pass
cd verdict && npm run build                # must pass
curl -fsS https://verdict-jade.vercel.app/api/status
```

Then check the public GitHub Actions run, the live demo in a clean browser, the
contract address in the Preprod explorer, and that the X profile URL opens without
login.
