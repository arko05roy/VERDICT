# VERDICT Protocol — Architecture Diagrams

---

## 1. High-Level Architecture

```mermaid
flowchart TB
    subgraph External["ANY RULE-BASED SYSTEM"]
        SYS["System Runtime<br/>(Game / Exchange / Insurance / IoT)"]
        ST["State Transitions<br/>prevState → currState + action"]
    end

    subgraph SDK["VERDICT SDK"]
        WIT["Witness Assembly<br/>(private data, never leaves)"]
        API["SDK Client<br/>TypeScript / Python / Rust / Go"]
    end

    subgraph Midnight["MIDNIGHT BLOCKCHAIN"]
        direction TB
        subgraph DAO["VERDICT DAO"]
            REG["Guardian Registry<br/>10 genesis + community"]
            PROP["VIP Proposals<br/>propose → vote → finalize"]
            COUNCIL["Council<br/>governance voting"]
        end

        subgraph Verifiers["Verifier Layer"]
            V1["Verifier v1.0<br/>Guardians I-X<br/>(immutable)"]
            V2["Verifier v1.1<br/>Guardians I-XI<br/>(immutable)"]
            VN["Verifier vN<br/>..."]
        end

        subgraph Rulesets["Rulesets (lightweight)"]
            R1["Ruleset A<br/>v1.0 | mask=0b1111100011 | params"]
            R2["Ruleset B<br/>v1.0 | mask=0b1111111111 | params"]
            R3["Ruleset C<br/>v1.1 | mask=0b11111111111 | params"]
        end

        LEDGER[("On-Chain State<br/>totalChecks | totalFlagged<br/>lastVerdict | sessionActive")]
    end

    subgraph Proof["PROOF SERVER"]
        ZKP["ZK Proof Generation<br/>~2-5s async"]
    end

    SYS --> ST
    ST --> WIT
    WIT --> API
    API --> ZKP
    ZKP --> LEDGER
    LEDGER -->|"CLEAN or FLAGGED"| API
    API -->|"verdict"| SYS

    DAO --> Verifiers
    Verifiers --> Rulesets
    Rulesets --> LEDGER

    style External fill:#1a1a2e,stroke:#e94560,color:#fff
    style SDK fill:#16213e,stroke:#0f3460,color:#fff
    style Midnight fill:#0f3460,stroke:#533483,color:#fff
    style Proof fill:#533483,stroke:#e94560,color:#fff
    style DAO fill:#1a1a3e,stroke:#e94560,color:#fff
```

---

## 2. The 10 Guardians — Check Taxonomy

```mermaid
mindmap
  root((VERDICT<br/>10 Guardians))
    **Cryptographic Integrity**<br/>Hard Assert — Unprovable if Broken
      I Mnemosyne<br/>Hash-chain integrity<br/>Catches: fabrication, replay, injection
      II Styx<br/>Commit-reveal binding<br/>Catches: retroactive editing, front-running
    **Rate-of-Change**<br/>Soft Flags
      III Hermes<br/>Velocity — first-order rate<br/>Catches: teleportation, impossible jumps
      IV Phaethon<br/>Acceleration — second-order rate<br/>Catches: gradual ramp exploits
    **Boundary Enforcement**<br/>Soft Flags
      V Terminus<br/>Bounds validation<br/>Catches: out-of-range states
    **Action Legitimacy**<br/>Soft Flags
      VI Themis<br/>Action validity<br/>Catches: invalid commands, injected ops
      VII Chronos<br/>Frequency limiting<br/>Catches: superhuman speed, bot spam
    **Statistical & Info-Theoretic**<br/>Soft Flags
      VIII Moirai<br/>Behavioral entropy<br/>Catches: scripted loops, bot patterns
      IX Daedalus<br/>Precision anomaly<br/>Catches: inhuman accuracy
      X Prometheus<br/>Information leakage<br/>Catches: acting on hidden data
```

---

## 3. Guardian Aggregation Logic

```mermaid
flowchart LR
    subgraph Hard["HARD ASSERT (Checks 1-2)"]
        C1["I Mnemosyne<br/>Hash-Chain"]
        C2["II Styx<br/>Commit-Reveal"]
    end

    subgraph Soft["SOFT FLAGS (Checks 3-10)"]
        C3["III Hermes"] --> AGG
        C4["IV Phaethon"] --> AGG
        C5["V Terminus"] --> AGG
        C6["VI Themis"] --> AGG
        C7["VII Chronos"] --> AGG
        C8["VIII Moirai"] --> AGG
        C9["IX Daedalus"] --> AGG
        C10["X Prometheus"] --> AGG
        AGG["anyFailed =<br/>sum of all flags"]
    end

    C1 -->|"assert fails"| UNPRV["NO VALID PROOF<br/>(unprovable)"]
    C2 -->|"assert fails"| UNPRV

    C1 -->|"pass"| CONT["Continue to<br/>soft checks"]
    C2 -->|"pass"| CONT
    CONT --> Soft

    AGG -->|"anyFailed > 0"| FLAGGED["FLAGGED"]
    AGG -->|"anyFailed == 0"| CLEAN["CLEAN"]

    style Hard fill:#8b0000,stroke:#ff4444,color:#fff
    style Soft fill:#1a3a1a,stroke:#44ff44,color:#fff
    style UNPRV fill:#ff0000,stroke:#fff,color:#fff
    style FLAGGED fill:#ff6600,stroke:#fff,color:#fff
    style CLEAN fill:#00aa00,stroke:#fff,color:#fff
```

---

## 4. Verification Flow — Sequence Diagram

```mermaid
sequenceDiagram
    participant SYS as System Runtime
    participant SDK as VERDICT SDK
    participant PS as Proof Server
    participant MN as Midnight Chain

    Note over SYS,MN: SESSION INITIALIZATION
    SYS->>SDK: Start new session
    SDK->>PS: startSession(genesisHash)
    PS->>MN: Deploy proof on-chain
    MN-->>SDK: sessionActive = true<br/>lastChainHash = genesisHash

    Note over SYS,MN: PER-TRANSITION LOOP (async, non-blocking)

    rect rgb(30, 30, 60)
        SYS->>SYS: Capture state transition<br/>(prevState → currState + action)

        Note over SYS,SDK: STEP 1: COMMIT
        SYS->>SDK: Commit to transition
        SDK->>SDK: hash(currPos, action, nonce)
        SDK->>PS: commitMove(commitment)
        PS->>MN: Store commitment on-chain

        Note over SYS,SDK: STEP 2: VERIFY
        SYS->>SDK: Submit witness data (private)
        SDK->>SDK: Assemble witnesses<br/>(positions, history, ticks, entities)
        SDK->>PS: verifyTransition(params, witnesses)

        Note over PS: ZK Proof Generation (~2-5s)
        PS->>PS: Run 10 Guardian checks<br/>inside ZK circuit (~940 constraints)
        PS->>MN: Submit proof on-chain

        MN->>MN: totalChecks++
        alt anyFailed > 0
            MN->>MN: totalFlagged++
            MN-->>SDK: verdict = FLAGGED
        else All checks pass
            MN-->>SDK: verdict = CLEAN
        end

        SDK-->>SYS: Return verdict
    end

    Note over SYS: System never pauses.<br/>Violations flagged retroactively.
```

---

## 5. VCL Compilation Pipeline

```mermaid
flowchart TD
    subgraph Input["RULESET CREATION"]
        direction LR
        MANUAL["Developer writes VCL<br/><code>use Hermes { maxVelocity: 5 }</code><br/><code>use Terminus { boundX: 1000 }</code>"]
        AI["AI Suggestion<br/>/api/suggest<br/>(JSON only, NEVER code)"]
    end

    AI -->|"suggests Guardians"| MANUAL
    MANUAL --> PARSER

    subgraph Pipeline["DETERMINISTIC PIPELINE (zero AI)"]
        PARSER["VCL Parser<br/>parser.ts<br/>Line-by-line validation"]
        PARSER -->|"valid AST"| COMPILER
        PARSER -->|"syntax error"| ERR["Error: invalid VCL"]

        COMPILER["VCL Compiler<br/>compiler.ts<br/>Pure function, zero side effects"]

        COMPILER --> UNION["Union witness requirements<br/>from selected Guardians"]
        UNION --> MASK["Generate bitmask<br/>e.g. 0b1111100011"]
        MASK --> PARAMS["Extract parameters<br/>{maxVelocity: 5, boundX: 1000, ...}"]
        PARAMS --> CONFIG["Output config:<br/>verifierVersion + mask + params"]
    end

    CONFIG --> REGISTER

    subgraph OnChain["ON-CHAIN (Midnight)"]
        REGISTER["registerRuleset()<br/>via DAO contract"]
        REGISTER --> LIVE["Ruleset LIVE<br/>Ready for verifications<br/>(no compilation needed)"]
    end

    style Input fill:#1a1a2e,stroke:#e94560,color:#fff
    style Pipeline fill:#16213e,stroke:#0f3460,color:#fff
    style OnChain fill:#0f3460,stroke:#00aa00,color:#fff
```

---

## 6. DAO Governance Flow

```mermaid
sequenceDiagram
    participant P as Proposer<br/>(anyone)
    participant DAO as VERDICT DAO<br/>(on-chain)
    participant C as Council Members
    participant REG as Guardian Registry
    participant VER as Verifier Versions

    Note over P,VER: PROPOSE NEW GUARDIAN

    P->>DAO: proposeCheck(checkId, templateHash, metadata)
    DAO->>DAO: Create proposal<br/>status = ACTIVE

    Note over C,DAO: VOTING PERIOD

    loop Each Council Member
        C->>DAO: vote(proposalId, approve/reject)
        DAO->>DAO: Check vote key hash<br/>(prevent double-vote)
        DAO->>DAO: Record vote<br/>voteCount++
    end

    alt voteCount >= voteThreshold
        DAO->>DAO: finalizeProposal()<br/>status = ACCEPTED
        DAO->>REG: Register new Guardian<br/>(mythName, template, params)

        Note over VER: NEW VERIFIER VERSION

        C->>VER: Compile new verifier<br/>with Guardian I-XI
        VER->>VER: v1.1 deployed<br/>(immutable)

        Note over VER: Existing rulesets on v1.0<br/>continue working unchanged.<br/>Migration is OPT-IN.
    else voteCount < voteThreshold
        DAO->>DAO: finalizeProposal()<br/>status = REJECTED
    end
```

---

## 7. Domain Application Map

```mermaid
flowchart TB
    VERDICT["VERDICT<br/>Universal ZK Integrity Layer<br/>10 Guardians | ~940 constraints"]

    subgraph Gaming["GAMING"]
        G_V["Verified: state transitions,<br/>physics rules, action validity"]
        G_P["Private: player positions,<br/>strategies, inputs"]
    end

    subgraph Finance["FINANCIAL COMPLIANCE"]
        F_V["Verified: transaction bounds,<br/>regulatory limits, rate controls"]
        F_P["Private: balances,<br/>counterparties, amounts"]
    end

    subgraph Supply["SUPPLY CHAIN"]
        S_V["Verified: checkpoint sequence,<br/>timing, valid routes"]
        S_P["Private: supplier IDs,<br/>pricing, routes"]
    end

    subgraph Voting["VOTING & GOVERNANCE"]
        V_V["Verified: eligibility rules,<br/>vote counts, single-vote"]
        V_P["Private: who voted<br/>for what"]
    end

    subgraph Market["MARKETPLACE"]
        M_V["Verified: bid/listing rules,<br/>price bounds, frequency"]
        M_P["Private: bidder identity,<br/>amounts, strategy"]
    end

    subgraph IoT["IoT & SENSORS"]
        I_V["Verified: reading ranges,<br/>valid sequences, timing"]
        I_P["Private: raw sensor data,<br/>device locations"]
    end

    VERDICT --- Gaming
    VERDICT --- Finance
    VERDICT --- Supply
    VERDICT --- Voting
    VERDICT --- Market
    VERDICT --- IoT

    style VERDICT fill:#e94560,stroke:#fff,color:#fff,font-weight:bold
    style Gaming fill:#1a1a2e,stroke:#4ecdc4,color:#fff
    style Finance fill:#1a1a2e,stroke:#f9ca24,color:#fff
    style Supply fill:#1a1a2e,stroke:#6c5ce7,color:#fff
    style Voting fill:#1a1a2e,stroke:#00b894,color:#fff
    style Market fill:#1a1a2e,stroke:#fd79a8,color:#fff
    style IoT fill:#1a1a2e,stroke:#74b9ff,color:#fff
```

---

## 8. On-Chain State Model

```mermaid
erDiagram
    VERDICT_DAO ||--|{ GUARDIAN : "registers"
    VERDICT_DAO ||--|{ PROPOSAL : "manages"
    VERDICT_DAO ||--|{ VERIFIER_VERSION : "tracks"
    VERDICT_DAO ||--|{ RULESET : "stores"
    VERDICT_DAO ||--|{ COUNCIL_MEMBER : "governs"
    VERIFIER_VERSION ||--|{ RULESET : "referenced by"
    GUARDIAN }|--|{ VERIFIER_VERSION : "included in"

    VERDICT_DAO {
        Counter nextCheckId
        Counter nextProposalId
        Uint64 voteThreshold
    }

    GUARDIAN {
        Uint64 checkId PK
        Bytes32 templateHash
        string mythName
        string category
    }

    PROPOSAL {
        Uint64 proposalId PK
        Uint64 checkId FK
        Bytes32 templateHash
        Uint64 voteCount
        string status "ACTIVE | ACCEPTED | REJECTED"
    }

    COUNCIL_MEMBER {
        Bytes32 identity PK
    }

    VERIFIER_VERSION {
        string versionId PK
        Uint64 guardianCount
        string status "ACTIVE | DEPRECATED"
    }

    RULESET {
        Uint64 rulesetId PK
        string verifierVersion FK
        Uint64 enableMask "bitmask"
        JSON params
        Counter totalChecks
        Counter totalFlagged
        Verdict lastVerdict "CLEAN | FLAGGED"
        Bytes32 lastChainHash
        Bytes32 commitment
        Boolean sessionActive
    }
```

---

## 9. Proof Lifecycle — State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle: System deployed

    Idle --> SessionActive: startSession(genesisHash)

    state SessionActive {
        [*] --> AwaitingCommit

        AwaitingCommit --> Committed: commitMove(hash)
        Committed --> Proving: verifyTransition(witnesses)

        state Proving {
            [*] --> RunningChecks
            RunningChecks --> HardAssert: Checks 1-2
            HardAssert --> SoftFlags: assert pass
            HardAssert --> Unprovable: assert fail
            SoftFlags --> Aggregating: Checks 3-10
            Aggregating --> VerdictReady
        }

        Proving --> Clean: anyFailed == 0
        Proving --> Flagged: anyFailed > 0
        Proving --> ProofInvalid: Hard assert failed

        Clean --> AwaitingCommit: next transition
        Flagged --> AwaitingCommit: next transition
    end

    SessionActive --> Idle: Session ends

    note right of Unprovable: No valid ZK proof exists.\nTampered data is mathematically\nunprovable, not just flagged.
```
