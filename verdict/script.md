## VERDICT — Pitch Script (~3:45)

### ACT 1: THE PROBLEM — Landing Page (0:00 – 1:00)

> *[Screen: Landing page with animated background, "VERDICT" title]*

"Every day, you interact with systems that enforce rules you cannot verify.

Your insurance claim — processed by an algorithm you can't inspect. Your trade on an exchange — executed at a price you have to trust. Your loan application — scored by a model that won't show its math. Your game — adjudicated by a server that could be lying about every outcome.

These aren't edge cases. This is the default. Every platform, every service, every institution that processes your data runs the same architecture: a black box that takes your inputs, applies rules internally, and tells you what happened. You have no proof the rules were followed. None.

And here's the structural problem: **the entity enforcing the rules is often the same entity that profits from breaking them.**

There is zero cryptographic proof that any rule was ever applied correctly. You're trusting a `console.log` on someone else's server.

That's not integrity. That's faith.

**Verdict fixes this.**"

> *[Click "EXPLORE PROTOCOL" → transitions to Overview dashboard]*

---

### ACT 2: THE PROTOCOL — Overview + Explore (1:00 – 1:50)

> *[Screen: Overview dashboard — stats, live feed, network status]*

"Verdict is a universal ZK integrity protocol built on Midnight. It doesn't replace existing systems. It doesn't touch business logic. It sits underneath and asks one question: **was this state transition valid?**

What you're looking at is the protocol dashboard. Live verifications streaming in — each one is a state transition being checked by a ZK circuit. 10 mathematical checks per transition. Bounds validation, action legitimacy, behavioral entropy, commit-reveal verification — the works.

See this? *[point to a CLEAN entry]* Clean. The system followed its own rules. And this one? *[point to FLAGGED]* Flagged. 9 out of 10 checks passed, one failed. That's not an accusation — that's a **proof**. Immutable, on-chain, verifiable by anyone.

Now here's what makes this a protocol and not a product—"

> *[Click to Explore page]*

"Every system gets its own ruleset. Insurance claim processing, exchange trade execution, game anti-cheat, lending compliance — each one is a deployed Compact contract on Midnight. Different rules, same verification engine. You don't build a new system per use case. You deploy a ruleset."

---

### ACT 3: DEPLOY — The Developer Story (1:50 – 2:50)

> *[Click to Deploy page]*

"And deploying one? Watch this.

I write rules in plain English."

> *[Type or show example rules: "Claim payouts must match the policy tier. Trade execution price cannot deviate more than 0.1% from quoted price. Player health cannot go below zero."]*

"Hit compile. Verdict takes these rules, translates them into a Compact ZK circuit — Midnight's native language — validates the syntax, and gives me a deployable contract.

*[Show compiled Compact code in Review step]*

This is real Compact. Pragma 0.22. It runs inside Midnight's ZK prover. The system under verification never sees the private data. The circuit sees **witnesses** — private inputs that get verified and discarded. That's the Midnight primitive doing what it was built for.

*[Click Deploy]*

Deployed. I have a contract address on Midnight. From writing English rules to a live ZK verification endpoint — that just happened.

But a deployed contract sitting on-chain does nothing if nobody can use it. So—"

> *[Click to Integrate page]*

---

### ACT 4: INTEGRATE — Plug and Play (2:50 – 3:20)

> *[Screen: Integrate page with SDK snippets]*

"Three lines of code. That's the integration.

```typescript
import { Verdict } from '@verdict/sdk'
const verdict = new Verdict('midnight1_abc123...')
const result = await verdict.verify({ prevState, currState, action })
```

Your system captures a state transition. The SDK submits it as a ZK witness — **private by default**. The circuit runs 10 checks. The proof settles on Midnight. You get back CLEAN or FLAGGED. The user's data, the internal state, the business logic — none of it is ever revealed. Not to you, not to anyone.

TypeScript, Python, Rust, Go. Pick your stack. Plug in the address. You're done."

---

### ACT 5: THE CLOSE — Explore/[id] (3:20 – 3:45)

> *[Click back to Explore, click into a specific ruleset like "FinServ Trade Execution Integrity"]*

"And this is what accountability looks like. Every ruleset has a public integrity profile. Total verifications. Flagged rate. Integrity score. All on-chain. All auditable.

*[Point to the stats: 14,832 verifications, 1.7% flagged rate]*

No more trusting platforms when they say 'we follow the rules.' Show me the proof. Literally.

**Verdict doesn't ask systems to be honest. It makes dishonesty mathematically impossible.**

The ZK circuit doesn't care who you are. It cares whether the rules were followed. And on Midnight, that proof is private, compact, and permanent.

That's Verdict. Universal rule integrity. Private by default. Built on Midnight because this is exactly what Midnight was made for."
