# Product Requirements Document — SA Simulator

**Interactive System Analyst Workflow Simulator**

| Parameter | Value |
|---|---|
| Version | 2.0 |
| Date | April 1, 2026 |
| Status | Active |
| Audience | Developers, scenario authors, AI coding agents |

---

## 1. Executive summary

SA Simulator is a deterministic scenario-based training platform that simulates the daily workflow of a System Analyst. Students progress through realistic project scenarios — from receiving a vague stakeholder request to defending architecture decisions — making decisions at each step with branching consequences, delayed effects, and multi-axis skill scoring.

The platform requires no AI/LLM backend. All content is delivered through pre-authored branching scenario graphs with deterministic scoring. Scenarios are modular JSON files loaded at runtime.

| Parameter | Value |
|---|---|
| Target audience | SA students, junior analysts, BA-to-SA transitioners |
| Platform | Desktop application (React + Rust + Tauri) |
| AI dependency | None — deterministic scenario graph interpreter |
| Data persistence | Local storage (localStorage → SQLite future) |
| MVP scope | Scenario engine + 1 Junior scenario |
| Expansion | Junior → Middle → Senior scenario packs |

---

## 2. Problem statement

System analysis education today teaches artifacts but not decision-making. Students learn what a BPMN diagram is, but not when to use one, how to spot errors in a colleague's diagram, or what happens downstream when they skip NFR analysis.

Real analyst skill requires: sequence reasoning, risk anticipation, artifact validation, stakeholder clarification, integration thinking, and traceability across the full requirements chain.

Key gaps in existing learning tools:

- No safe environment to practice stakeholder communication and requirements elicitation
- Inability to experience consequences of decisions (e.g., skipping retry policy on step 3 → duplicate payments incident on step 8)
- Lack of practice reviewing and finding errors in real artifacts (BPMN, sequence diagrams, ER schemas, API contracts)
- No structured progression from basic requirements writing to system design and architecture
- No training on requirements traceability — connecting business goals to FT to components to tests

SA Simulator addresses these gaps with a branching scenario engine where every decision has measurable, delayed consequences.

---

## 3. Solution overview

### 3.1 Core concept: scenario graph interpreter

This is NOT a quiz engine. Each training session is a scenario graph — a directed graph of decision nodes where the student's path through the graph is determined by accumulated flags, unlocked branches, and triggered consequences. The engine interprets this graph at runtime, evaluating branch conditions against the current flag state.

The core loop: `context → decision → flags → consequences → next node`

### 3.2 Game loop

Each node in the scenario graph follows this cycle:

1. **Context** — situation description + optional artifact (BPMN diagram, requirements table, RTM matrix, API contract)
2. **Decision** — the system presents a decision point with 2–6 options
3. **Selection** — student picks one or multiple answers, reorders items, classifies artifacts, or analyzes a diagram
4. **Feedback** — immediate explanation of why each option is correct or incorrect
5. **Flag mutation** — the engine updates the flag state (unlocks, triggers, score deltas)
6. **Branching** — the engine evaluates `requires`/`excludes` conditions to determine the next node

### 3.3 Butterfly effect mechanics

Every choice records flags into the scenario state. Three flag types control branching:

- **unlocks** — enables future nodes (e.g., asking about NFR unlocks the performance requirements node)
- **triggers** — activates consequence nodes later (e.g., skipping interview triggers a negative review from the team lead)
- **requires / excludes** — controls which variant of a node appears based on accumulated flags

### 3.4 Timeline system

The engine maintains a timeline of cause-effect pairs. When a delayed consequence fires, the timeline shows the student exactly which earlier decision caused it.

Example chain:
- Step 3: student skips retry policy question → flag `retry-skipped` set
- Step 8: duplicate payments incident fires → timeline shows "Caused by: skipping retry policy (step 3)"

This enables retrospective reasoning training — students learn to think about downstream effects of early decisions.

---

## 4. Difficulty tiers

Scenarios are organized into three difficulty levels, each introducing progressively complex SA artifacts and skills.

| Tier | Project scope | Steps | Key artifacts |
|---|---|---|---|
| Junior | Single feature, one service, one stakeholder | 8–12 | Clarifying questions, FT/NFT, Use Case, User Stories, simple BPMN, screen mockup |
| Middle | Cross-service feature, integrations, multiple stakeholders | 15–25 | Sequence diagram, REST API contract, ER diagram, BPMN with pools/gateways, State diagram, basic RTM |
| Senior | System design, migration, high-load architecture | 25–40 | System design, C4 model, Kafka/RabbitMQ, data migration, API Gateway, NFR (SLA, RPS, latency), ADR, DFD, full RTM |

---

## 5. Artifact support matrix

### 5.1 Requirements artifacts

| Artifact | Junior | Middle | Senior | Rendering |
|---|---|---|---|---|
| Functional requirements (FT) | Review & fix | Author & validate | Trace to components | Structured table |
| Non-functional requirements (NFT) | Select appropriate | Formulate with metrics | Budget across services | Structured table |
| Constraints & assumptions | Identify | Document | Challenge | Text list |
| User Stories | Validate format | Write with acceptance criteria | Decompose epics | Text cards |
| Acceptance criteria | — | Review & fix | Author & validate | Checklist |
| **Requirements Traceability Matrix** | — | **Basic mapping** | **Full chain traceability** | **Interactive matrix** |

### 5.2 RTM as a first-class artifact

RTM is not a peripheral document — it is the connective tissue of all SA deliverables. The simulator treats it as a trainable skill with dedicated exercise types:

**Middle-level RTM exercises:**
- Given 8 FTs and 5 system components, identify which requirements have no coverage (orphaned requirements)
- Given a Use Case and a set of FTs, map each Use Case step to the FT it fulfills
- Given an ER diagram and FTs, identify which data entities are not traced to any requirement

**Senior-level RTM exercises:**
- Full chain traceability: business goal → FT → sequence diagram step → API endpoint → test scenario
- Restore a broken trace chain (one link is missing — find it)
- Validate completeness: given a complete set of artifacts, find the requirement with no test coverage
- Trace NFT to architecture decisions (e.g., "response time < 500ms" → caching layer → Redis)
- Identify contradictions between traced requirements

**RTM node type:** `drag_classification` — student drags requirements to components/tests/diagram steps to build the trace matrix.

### 5.3 Modeling artifacts

| Artifact | Junior | Middle | Senior | Rendering |
|---|---|---|---|---|
| Use Case tables | Review & fix | Author | Complex actors | Structured table |
| BPMN diagrams | Find errors | Pools & gateways | Cross-org processes | Mermaid |
| Sequence diagrams | — | Review & fix | Author & validate | Mermaid |
| State diagrams | — | Review | Design state machines | Mermaid |
| Class diagrams | — | Review | Design domain model | Mermaid |
| ER diagrams | — | Review & fix | Normalize & optimize | Mermaid |

### 5.4 Architecture artifacts

| Artifact | Junior | Middle | Senior | Rendering |
|---|---|---|---|---|
| API contracts (OpenAPI subset) | — | Review & validate | Design & version | JSON / structured table |
| Integration topology | — | Understand flows | Design topology | Mermaid |
| Message broker scenarios | — | Select appropriate | Design topics & schemas | Structured table |
| C4 model | — | — | Context & container views | Mermaid |
| ADR | — | — | Author & defend | Text template |
| Data Flow Diagram | — | — | Author & validate | Mermaid |

---

## 6. Skill vector model

Student performance is tracked across a multi-dimensional skill vector. Each decision modifies one or more vector components.

| Skill dimension | What it measures | Introduced at |
|---|---|---|
| `stakeholder_communication` | Interview quality, right questions, conflict handling | Junior |
| `scope_control` | Avoiding scope creep, saying no, prioritization | Junior |
| `requirement_quality` | FT/NFT formulation, measurability, completeness | Junior |
| `nfr_awareness` | Attention to performance, security, compatibility | Junior |
| `diagram_accuracy` | Reading, reviewing, and fixing UML/BPMN artifacts | Junior |
| `traceability` | RTM building, coverage analysis, chain validation | Middle |
| `integration_awareness` | API design, async patterns, retry/idempotency | Middle |
| `data_modeling` | ER design, normalization, migration planning | Middle |
| `api_design` | Contract quality, versioning, error handling | Middle |
| `architecture_reasoning` | System design, tradeoffs, ADR quality | Senior |
| `risk_prediction` | Anticipating downstream consequences of decisions | Senior |

### 6.1 Scoring formula

Final score per axis = earned points / maximum possible points for visited nodes. Each question type uses a different scoring mechanism:

- **Single choice** — full points for correct answer, negative points for wrong answer
- **Multi-select** — partial credit per correct selection, penalty per incorrect selection, penalty for missed correct options
- **Prioritization** — +1 point for each item in the correct position
- **Drag classification (RTM)** — +1 point per correct mapping, -1 per incorrect mapping

### 6.2 Result screen

After completing all nodes, the student sees:

- Overall percentage score with grade (Excellent / Good / Satisfactory / Needs practice)
- Skill radar chart showing all dimensions
- Per-axis progress bars for the dimensions active in the completed scenario
- Personalized recommendations based on weakest dimensions
- Timeline view showing all cause-effect chains that fired
- Option to replay the scenario

---

## 7. Scenario data structure

Each scenario is a self-contained JSON file with the following schema:

| Field | Type | Description |
|---|---|---|
| `scenario_id` | string | Unique scenario identifier |
| `title` | string | Display name |
| `level` | enum | `junior` \| `middle` \| `senior` |
| `pack` | string | Scenario pack this belongs to (e.g., `core`, `fintech`) |
| `description` | string | Brief context shown on the start screen |
| `skills_tracked` | string[] | Which skill dimensions are active in this scenario |
| `nodes[]` | array | Ordered list of scenario nodes |
| `nodes[].node_id` | string | Unique node identifier (used in unlocks/triggers) |
| `nodes[].node_type` | enum | `single_choice` \| `multi_select` \| `ordering` \| `drag_classification` \| `diagram_analysis` \| `artifact_review` |
| `nodes[].stage` | string | Display label for the current workflow phase |
| `nodes[].context` | string | Situation description shown to the student |
| `nodes[].context_artifact` | object \| null | Optional artifact displayed before the question |
| `nodes[].requires_flags` | string[] | Flags that must be present for this node to appear |
| `nodes[].excludes` | string[] | Node IDs that, if visited, prevent this node from appearing |
| `nodes[].choices[]` | array | Decision options |
| `nodes[].choices[].id` | string | Unique choice identifier |
| `nodes[].choices[].text` | string | Display text |
| `nodes[].choices[].correct` | boolean | Whether this is a correct/optimal choice |
| `nodes[].choices[].skill_effects` | object | Score deltas per skill dimension |
| `nodes[].choices[].sets_flags` | string[] | Flags to add to state |
| `nodes[].choices[].feedback` | string | Explanation shown after answering |
| `nodes[].choices[].timeline_event` | string \| null | If set, recorded in timeline with cause reference |

### 7.1 Artifact types

Artifacts are displayed inline before the question to provide visual context:

- **table** — structured table with headers and rows (FT list, NFT list, comparison matrix)
- **usecase** — Use Case table with labeled fields (actor, precondition, main/alt flows, postcondition)
- **stories** — list of User Story texts with acceptance criteria
- **rtm** — traceability matrix with source/target columns and mapping cells
- **diagram** — Mermaid.js diagram (BPMN, sequence, state, class, ER, flowchart)
- **api_contract** — JSON/YAML structured view of API endpoints
- **adr** — Architecture Decision Record template with status, context, decision, consequences

### 7.2 Node types

| Node type | Interaction | Scoring | Use case |
|---|---|---|---|
| `single_choice` | Click one option | Full points or penalty | Binary decisions, best-approach questions |
| `multi_select` | Check multiple, confirm | Partial credit per selection | Interview questions, error detection |
| `ordering` | Drag or arrow reorder | +1 per correct position | Backlog prioritization, sequence ordering |
| `drag_classification` | Drag items to categories | +1 per correct mapping | RTM building, categorization |
| `diagram_analysis` | Click on diagram element | Points for correct identification | Finding errors in BPMN/sequence/ER |
| `artifact_review` | Highlight issues in artifact | Points per found issue | Review FT tables, API contracts |

---

## 8. Scenario packs

Scenarios are organized into packs — thematic collections loaded from `/scenarios/*.json`.

| Pack | Level | Scenarios | Domain |
|---|---|---|---|
| `core` | Junior–Senior | Order filters, Payment gateway, Monolith migration | Generic e-commerce |
| `fintech` | Middle–Senior | KYC integration, Transaction reconciliation | Financial services |
| `logistics` | Middle–Senior | Route optimization, Warehouse management | Supply chain |
| `enterprise` | Senior | Legacy CRM migration, ERP integration | Enterprise systems |

Packs load dynamically. The engine validates each scenario JSON against the schema at load time.

---

## 9. MVP scenario: order page filters

The first implemented scenario covers the full Junior workflow for adding filters to an order management page.

| Step | Phase | Node type | Key decision |
|---|---|---|---|
| 1 | Incoming request | single_choice | Ask questions vs. jump to specs vs. delegate to dev |
| 2a | Full interview | multi_select | Choose which questions to ask the stakeholder (6 options) |
| 2b | Short interview | multi_select | Constrained version if interview was skipped (consequence of step 1) |
| 3 | Functional requirements | multi_select | Find errors in a draft FT table (vague terms, misclassified NFR, missing items) |
| 4 | Non-functional requirements | multi_select | Select appropriate NFR (concrete vs. vague vs. over-engineered) |
| 5 | Use Case | single_choice | Identify the most important alternative flow |
| 6 | User Stories | single_choice | Find the incorrectly written User Story |
| 7 | BPMN review | single_choice | Find the error in a BPMN diagram (missing gateway) |
| 8a | Positive review | single_choice | Identify missing artifact (if interview was done) |
| 8b | Negative review | single_choice | Handle team lead criticism (if interview was skipped) |
| 9 | Backlog prioritization | ordering | Order features by sprint priority |

Skills tracked: `stakeholder_communication`, `scope_control`, `requirement_quality`, `nfr_awareness`, `diagram_accuracy`

---

## 10. Technical architecture

### 10.1 Technology stack

| Layer | Technology | Notes |
|---|---|---|
| UI framework | React | Component-based UI with inline styling |
| Scenario engine | Rust | Scenario graph interpreter, flag evaluation, skill scoring |
| Runtime | Tauri | Desktop container, local file access, small binary size |
| Diagram rendering | Mermaid.js | Loaded locally, renders BPMN/sequence/state/ER/class |
| Persistence | localStorage (v1) → SQLite (v2) | Progress, skill vectors, completed scenarios |
| Scenario loading | JSON files in `/scenarios/` | Validated against schema at load time |

### 10.2 Rust engine responsibilities

The Rust engine handles all deterministic logic:

- Parse and validate scenario JSON against schema
- Evaluate branch conditions (`requires_flags`, `excludes`) against current flag state
- Compute skill vector deltas for each choice
- Maintain timeline of cause-effect events
- Determine next available node after each decision
- Calculate final scores and generate recommendations

React handles rendering only — all state transitions flow through the Rust engine via Tauri commands.

### 10.3 State shape

| Field | Type | Purpose |
|---|---|---|
| `screen` | `menu` \| `play` \| `result` | Current application screen |
| `scenario_id` | string | Currently loaded scenario |
| `current_node` | string | Active node ID |
| `visited` | string[] | IDs of visited nodes (prevents revisiting) |
| `flags` | string[] | Accumulated unlock/trigger flags |
| `skill_vector` | object | Current scores per skill dimension |
| `selected` | string[] | Currently selected choice IDs |
| `answered` | boolean | Whether the current node has been answered |
| `feedback` | string | Feedback text to display |
| `timeline` | event[] | Cause-effect chain records |

### 10.4 Tauri command interface

| Command | Direction | Purpose |
|---|---|---|
| `load_scenario(id)` | JS → Rust | Parse and validate scenario JSON |
| `get_current_node()` | JS → Rust | Get current node with resolved artifacts |
| `submit_choice(ids[])` | JS → Rust | Process selection, update flags/scores, return feedback |
| `get_next_node()` | JS → Rust | Evaluate conditions, return next available node |
| `get_results()` | JS → Rust | Calculate final scores, generate recommendations |
| `get_timeline()` | JS → Rust | Return cause-effect chain for display |
| `list_scenarios()` | JS → Rust | List available scenarios from `/scenarios/` |

---

## 11. UI structure

### 11.1 Screens

| Screen | Purpose |
|---|---|
| Scenario selection | Browse available scenario packs, see difficulty/skills, pick scenario |
| Scenario workspace | Main gameplay: context panel, artifact viewer, decision area |
| Result dashboard | Skill radar, per-axis bars, timeline, recommendations |

### 11.2 Workspace layout

| Area | Content |
|---|---|
| Top bar | Progress indicator, current phase label, scenario title |
| Left panel | Scenario context text |
| Center panel | Artifact viewer (diagrams, tables, RTM matrix) |
| Right panel | Decision options / question area |
| Bottom panel | Timeline (collapsed by default, expands to show cause-effect chain) |

---

## 12. Expansion roadmap

### Phase 1: MVP

- Rust scenario engine with flag evaluation and branching
- `single_choice`, `multi_select`, `ordering` node types
- Artifact rendering: tables, Use Case, BPMN (Mermaid)
- 5 skill dimensions scored
- 1 Junior scenario (Order Filters, 10 nodes)
- Timeline tracking (basic)
- Result screen with skill bars

### Phase 2: Middle scenarios + RTM

- New scenario: Payment Gateway Integration (15–20 nodes)
- New node types: `drag_classification`, `diagram_analysis`
- New artifacts: Sequence diagram, ER diagram, State diagram, API contract, basic RTM
- RTM exercises: mapping FT → components, finding orphaned requirements
- 6 additional skill dimensions (traceability, integration, data modeling, API design)
- Multiple stakeholder interviews with conflicting priorities
- SQLite persistence via Tauri

### Phase 3: Senior scenarios + full RTM

- New scenario: Monolith-to-Microservices Migration (25–40 nodes)
- New artifacts: C4 diagrams, ADR, DFD, Kafka event schemas
- Full RTM chain: business goal → FT → diagram step → API endpoint → test
- `artifact_review` node type
- NFR budget exercises (latency breakdown across services)
- Architecture tradeoff decisions with ADR authoring
- Scenario packs: fintech, logistics, enterprise

### Phase 4: Platform features

- Skill radar dashboard across all completed scenarios
- Growth tracking over time (skill vector history)
- Scenario editor for instructors
- Scenario validation CLI tool
- Export results as PDF
- Community scenario pack sharing

---

## 13. Non-functional requirements

| Requirement | Target | Rationale |
|---|---|---|
| Offline execution | 100% features work without network | Primary use case is local training |
| Node transition time | < 10ms | Rust engine ensures instant response |
| Scenario load time | < 100ms for 40-node scenario | JSON parsing in Rust |
| Binary size | < 15MB (Tauri) | Lightweight desktop distribution |
| Diagram rendering | < 200ms | Mermaid local rendering |
| Scenario pack size | < 500KB per pack | JSON + Mermaid text |
| Persistence reliability | Zero data loss on crash | SQLite WAL mode (Phase 2) |

---

## 14. Requirements traceability matrix

| Req ID | Requirement | Module | Priority | Phase |
|---|---|---|---|---|
| FR-001 | Load and validate scenario JSON | Rust engine | High | 1 |
| FR-002 | Interpret branching logic (flags, requires, excludes) | Rust engine | High | 1 |
| FR-003 | Track and mutate flag state | Rust engine | High | 1 |
| FR-004 | Compute skill vector scoring | Rust engine | High | 1 |
| FR-005 | Render Mermaid diagrams | React renderer | High | 1 |
| FR-006 | Timeline event recording | Rust engine | High | 1 |
| FR-007 | single_choice node type | React + Rust | High | 1 |
| FR-008 | multi_select node type | React + Rust | High | 1 |
| FR-009 | ordering node type | React + Rust | High | 1 |
| FR-010 | drag_classification node type (RTM) | React + Rust | High | 2 |
| FR-011 | diagram_analysis node type | React + Rust | Medium | 2 |
| FR-012 | artifact_review node type | React + Rust | Medium | 3 |
| FR-013 | RTM artifact rendering | React renderer | High | 2 |
| FR-014 | Sequence diagram support | React renderer | High | 2 |
| FR-015 | ER diagram support | React renderer | High | 2 |
| FR-016 | State diagram support | React renderer | Medium | 2 |
| FR-017 | API contract rendering | React renderer | Medium | 2 |
| FR-018 | C4 diagram support | React renderer | Medium | 3 |
| FR-019 | ADR template rendering | React renderer | Medium | 3 |
| FR-020 | Persist progress locally | Tauri storage | High | 1 |
| FR-021 | Scenario pack dynamic loading | Rust loader | High | 1 |
| FR-022 | Skill radar dashboard | React UI | Medium | 1 |
| FR-023 | Timeline visualization | React UI | Medium | 1 |
| FR-024 | Result screen with recommendations | React + Rust | High | 1 |
| NFR-001 | Offline execution | Tauri runtime | High | 1 |
| NFR-002 | Node transition < 10ms | Rust engine | High | 1 |
| NFR-003 | Modular scenario packs | JSON architecture | High | 1 |
| NFR-004 | Deterministic scoring | Rust engine | High | 1 |

---

## 15. Success metrics

| Metric | Target | Measurement |
|---|---|---|
| Scenario completion rate | > 80% | Students who start a scenario and finish all nodes |
| Replay rate | > 30% | Students who replay to improve their score |
| Average score improvement | +15% on replay | Difference between first and second attempt |
| Time per scenario | 10–20 min (Junior), 30–45 min (Senior) | Session duration from start to result screen |
| Artifact error detection | > 60% accuracy | Correct identification of errors in BPMN/FT/UC/RTM |
| RTM coverage accuracy | > 50% on first attempt | Correct trace mappings in drag_classification exercises |
| Skill vector growth | Measurable improvement across 3+ scenarios | Delta between first and third completed scenario |

---

## 16. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scenario authoring complexity | High | JSON schema validation, future visual editor (Phase 4) |
| Diagram rendering edge cases | Medium | Mermaid local rendering, fallback to structured tables |
| Skill scoring calibration | Medium | Playtesting with real SA students, iterative adjustment |
| Content becomes outdated | Medium | Modular packs allow targeted updates without engine changes |
| Students memorize answers | Low | Multiple branching paths per scenario, future question pool rotation |
| Rust-JS bridge complexity | Medium | Thin Tauri command interface, all logic in Rust, React is render-only |

---

## Appendix A: Adding new scenarios

Create a JSON file in `/scenarios/` following the schema in Section 7. The Rust engine validates the file at load time. Each node contains a `choices` array with `skill_effects`, `sets_flags`, and `feedback`. Use `requires_flags` and `excludes` to create branching paths. Add `timeline_event` strings to choices that should appear in the cause-effect timeline.

To add a new scenario pack, create a directory under `/scenarios/` with a `pack.json` manifest listing the contained scenarios, their difficulty levels, and tracked skill dimensions.

## Appendix B: RTM exercise design guide

When authoring RTM exercises for Middle and Senior scenarios:

1. Start with a complete set of artifacts (FTs, components, diagrams, tests)
2. Remove 20–30% of trace links to create the exercise
3. Include 1–2 distractor mappings (plausible but incorrect links)
4. Ensure at least one "orphaned requirement" (no downstream trace) exists
5. For Senior: include at least one cross-artifact chain (FT → sequence step → API endpoint)
6. Set `skill_effects.traceability` as the primary scoring dimension
7. Add `timeline_event` if missing trace links cause downstream consequences later in the scenario
