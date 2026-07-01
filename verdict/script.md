## VERDICT — Pitch Script (~3:45)

### ACT 1: THE PROBLEM — Landing Page (0:00 – 1:00)

> *[Screen: Landing page with animated background, "VERDICT" title]*

"Let me ask you something. When you play a game online — Valorant, poker, anything — how do you know the server isn't lying to you?

You don't.

Right now, every multiplayer game on the planet runs on the same architecture: a central server that processes your inputs, updates game state, and tells you what happened. You trust that server completely. Your rank, your money, your items — all of it depends on a black box you cannot inspect.

And here's the thing nobody talks about: **it's not just games.** Any rule-based system — casino platforms, competitive esports, play-to-earn economies — they all have the same fundamental flaw. The entity enforcing the rules is the same entity that profits from breaking them.

There is zero cryptographic proof that any rule was ever enforced. None. You're trusting a `console.log` on someone else's server.

That's not integrity. That's faith.

**Verdict fixes this.**"

> *[Click "EXPLORE PROTOCOL" → transitions to Overview dashboard]*

---

### ACT 2: THE PROTOCOL — Overview + Explore (1:00 – 1:50)

> *[Screen: Overview dashboard — stats, live feed, network status]*

"Verdict is a universal ZK integrity protocol built on Midnight. It doesn't replace game servers. It doesn't touch gameplay. It sits underneath and asks one question: **was this state transition valid?**

What you're looking at is the protocol dashboard. Live verifications streaming in — each one is a game state transition being checked by a ZK circuit. 10 mathematical checks per transition. Velocity bounds, action validity, behavioral entropy, commit-reveal verification — the works.

See this? *[point to a CLEAN entry]* Clean. The server played fair. And this one? *[point to FLAGGED]* Flagged. 9 out of 10 checks passed, one failed. That's not a ban — that's a **proof**. Immutable, on-chain, verifiable by anyone.

Now here's what makes this a protocol and not a product—"

> *[Click to Explore page]*

"Every game gets its own ruleset. FPS anti-cheat, poker fairness, MMO economy validation, chess move integrity — each one is a deployed Compact contract on Midnight. Different rules, same verification engine. You don't build a new system per game. You deploy a ruleset."

---

### ACT 3: DEPLOY — The Developer Story (1:50 – 2:50)

> *[Click to Deploy page]*

"And deploying one? Watch this.

I write rules in plain English."

> *[Type or show example rules: "Players cannot move faster than 5 units per tick. Cards must be in hand before playing. Health cannot go below zero."]*

"Hit compile. Verdict takes these rules, translates them into a Compact ZK circuit — Midnight's native language — validates the syntax, and gives me a deployable contract.

*[Show compiled Compact code in Review step]*

This is real Compact. Pragma 0.22. It runs inside Midnight's ZK prover. The game server never sees player data. The circuit sees **witnesses** — private inputs that get verified and discarded. That's the Midnight primitive doing what it was built for.

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

Your game captures a state transition. The SDK submits it as a ZK witness — **private by default**. The circuit runs 10 checks. The proof settles on Midnight. You get back CLEAN or FLAGGED. The player's data, strategy, position — none of it is ever revealed. Not to you, not to anyone.

TypeScript, Python, Rust, Go. Pick your stack. Plug in the address. You're done."

---

### ACT 5: THE CLOSE — Explore/[id] (3:20 – 3:45)

> *[Click back to Explore, click into a specific ruleset like "Valorant Anti-Cheat Module"]*

"And this is what accountability looks like. Every ruleset has a public integrity profile. Total verifications. Flagged rate. Integrity score. All on-chain. All auditable.

*[Point to the stats: 14,832 verifications, 1.7% flagged rate]*

No more trusting game companies when they say 'we take cheating seriously.' Show me the proof. Literally.

**Verdict doesn't ask game servers to be honest. It makes dishonesty mathematically impossible.**

The ZK circuit doesn't care who you are. It cares whether the rules were followed. And on Midnight, that proof is private, compact, and permanent.

That's Verdict. Universal rule integrity. Private by default. Built on Midnight because this is exactly what Midnight was made for."
