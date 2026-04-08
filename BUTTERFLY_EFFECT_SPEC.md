# Butterfly Effect — Technical Specification

Reference document for AI agents working on the SA Simulator branching logic.

---

## What it is

Butterfly effect is a delayed consequence system. A mistake made on an early step causes a consequence node to appear later in the scenario. If the student makes the right choice, the consequence node never appears — it is silently skipped.

This creates the feeling that early decisions have weight. The student learns to think about downstream effects.

---

## How it works — data flow

### Step 1: Student makes a mistake (early in scenario)

The wrong choice has a flag in `sets_flags`:

```json
{
  "id": "s3_c2",
  "text": "No gateway needed — client will figure it out",
  "correct": false,
  "sets_flags": ["no_gateway"],
  "timeline_event": "BPMN approved without payment gateway"
}
```

When `submit_choice` is called in Rust, the flag `"no_gateway"` is pushed into `session.flags`.

### Step 2: Normal steps continue (middle of scenario)

Steps 4–9 proceed normally. The flag sits in `session.flags` doing nothing. The student has no indication that a consequence is coming.

### Step 3: Consequence node activates (late in scenario)

A consequence node has `requires_flags` pointing to the error flag:

```json
{
  "node_id": "step_10_consequence_no_gateway",
  "requires_flags": ["no_gateway"],
  "context": "A week later: the warehouse assembled an unpaid order...",
  "timeline_event": "Warehouse assembled unpaid order — caused by missing gateway in BPMN"
}
```

When `get_next_node` runs, it checks: is `"no_gateway"` in `session.flags`? If yes → this node is eligible. If no → this node is skipped.

### Step 4: If student made the RIGHT choice

The correct choice sets a different flag (or no flag). `"no_gateway"` never enters `session.flags`. The consequence node's `requires_flags` check fails. The node is skipped. The student never sees it.

---

## Files involved

### 1. Scenario JSON (`/scenarios/*.json`)

Defines the flags and consequence nodes.

**On the wrong choice (cause):**
```json
{
  "id": "s3_c2",
  "correct": false,
  "sets_flags": ["no_gateway"],
  "timeline_event": "BPMN approved without payment gateway"
}
```

**On the consequence node (effect):**
```json
{
  "node_id": "step_10_consequence_no_gateway",
  "requires_flags": ["no_gateway"],
  "excludes": [],
  "choices": [
    {
      "id": "s10_c1",
      "text": "Fix the BPMN and add the gateway",
      "correct": true,
      "timeline_event": "Warehouse assembled unpaid order — caused by missing gateway in BPMN"
    }
  ]
}
```

### 2. Rust engine (`/src-tauri/src/commands.rs`)

Two functions handle the butterfly effect:

**`submit_choice`** — writes flags to session:
```rust
// Inside the for loop over choice_ids:
for flag in &choice.sets_flags {
    if !session.flags.contains(flag) {
        session.flags.push(flag.clone());
    }
}
```

**`get_next_node`** — evaluates which node to show next:
```rust
let next_node = scenario.nodes.iter().find(|n| {
    // Skip already visited nodes
    if session.visited.contains(&n.node_id) { return false; }
    
    // ALL requires_flags must be present in session.flags
    let requires_met = n.requires_flags.iter()
        .all(|f| session.flags.contains(f));
    
    // NONE of the excludes should match visited nodes or flags
    let excludes_met = !n.excludes.iter()
        .any(|f| session.visited.contains(f) || session.flags.contains(f));
    
    requires_met && excludes_met
});
```

The engine iterates nodes **in array order** and returns the **first** that passes all checks.

### 3. Rust models (`/src-tauri/src/models.rs`)

Session state holds the flags:
```rust
pub struct SessionState {
    pub flags: Vec<String>,        // accumulated flags from all choices
    pub visited: Vec<String>,      // node_ids of visited nodes
    pub timeline: Vec<String>,     // timeline_event strings
    // ... other fields
}
```

### 4. React frontend (`/src/views/ScenarioWorkspace.tsx`)

The frontend does NOT handle butterfly logic. It simply:
1. Calls `submit_choice` (Rust adds flags)
2. Calls `get_next_node` (Rust evaluates requires/excludes)
3. Renders whatever node Rust returns

The frontend does display the `timeline` panel, which shows the cause-effect chain.

### 5. Zustand store (`/src/store/useScenarioStore.ts`)

Calls Tauri commands. Does not evaluate flags or branching — that is Rust's job.

```typescript
submitChoices: async (choiceIds) => {
    await invoke('submit_choice', { choiceIds });
},
advanceNode: async () => {
    const nextNode = await invoke('get_next_node');
    set({ currentNode: nextNode });
},
```

---

## Node evaluation rules

When `get_next_node` is called, the engine iterates ALL nodes in the JSON array and returns the first matching one:

1. **Not visited:** `node_id` is not in `session.visited`
2. **Requires met:** ALL strings in `requires_flags` exist in `session.flags`
3. **Excludes met:** NONE of the strings in `excludes` exist in `session.visited` OR `session.flags`

**Array order matters.** If two nodes both pass checks, the one earlier in the JSON array wins. This is why "happy path" nodes should come before "error path" nodes in the array.

---

## Mutually exclusive nodes pattern

When a step has two variants (good path vs bad path), use `excludes`:

```json
{
  "node_id": "step_8a_good_review",
  "requires_flags": [],
  "excludes": ["skipped_interview"]
},
{
  "node_id": "step_8b_bad_review", 
  "requires_flags": ["skipped_interview"],
  "excludes": ["step_8a_good_review"]
}
```

- If `skipped_interview` flag is NOT set → `step_8a` passes (no requires, no excludes hit) → shown
- If `skipped_interview` flag IS set → `step_8a` fails (excludes contains the flag) → `step_8b` passes → shown

---

## Timeline connection

Both the **cause** choice and the **effect** choice should have `timeline_event` strings:

- Cause: `"BPMN approved without payment gateway"` (set on the wrong choice in the early step)
- Effect: `"Warehouse assembled unpaid order — caused by missing gateway in BPMN"` (set on the consequence node)

The frontend displays these as a numbered list in the Timeline panel, showing the student the causal chain.

---

## Debugging butterfly effect

### Add debug command to Rust

Add to `commands.rs`:
```rust
#[derive(serde::Serialize)]
pub struct DebugInfo {
    pub scenario_id: Option<String>,
    pub current_node: Option<String>,
    pub visited: Vec<String>,
    pub flags: Vec<String>,
    pub skill_vector: HashMap<String, f32>,
    pub timeline: Vec<String>,
}

#[tauri::command]
pub fn debug_session(state: State<'_, AppState>) -> Result<DebugInfo, String> {
    let session = state.session.lock().unwrap();
    Ok(DebugInfo {
        scenario_id: session.scenario_id.clone(),
        current_node: session.current_node.clone(),
        visited: session.visited.clone(),
        flags: session.flags.clone(),
        skill_vector: session.skill_vector.clone(),
        timeline: session.timeline.clone(),
    })
}
```

Register in `lib.rs`: add `debug_session` to `invoke_handler`.

### Add debug logging to frontend

In `ScenarioWorkspace.tsx`:
```typescript
const debugSession = async (label: string) => {
    try {
        const debug = await invoke('debug_session');
        console.log(`[DEBUG ${label}]`, debug);
    } catch (e) {
        console.warn('debug_session not available:', e);
    }
};
```

Call after every `submitChoices` and `advanceNode`.

### What to check in console output

After making a wrong choice on step 3:
```
[DEBUG after submit on step_3] {
  flags: ["no_gateway"],        // ← flag should be here
  visited: ["step_1", "step_2", "step_3"],
  current_node: "step_3"
}
```

After reaching the consequence step:
```
[DEBUG after advanceNode] {
  flags: ["no_gateway"],
  visited: [..., "step_10_consequence_no_gateway"],  // ← consequence should be visited
  current_node: "step_10_consequence_no_gateway"
}
```

### If consequence node does NOT appear

Check these in order:

1. **Flag not set:** Does the wrong choice's `sets_flags` contain the flag? Check console — is the flag in `session.flags` after submit?

2. **Flag name mismatch:** Does `requires_flags` on the consequence node match EXACTLY the flag name in `sets_flags`? (case-sensitive, no typos)

3. **Node already visited:** Is the consequence node_id already in `session.visited`? (should not be)

4. **Excludes blocking:** Does the consequence node have `excludes` that match a visited node or flag? Check if any string in `excludes` exists in `session.visited` or `session.flags`.

5. **Node order:** Is the consequence node placed AFTER all normal steps in the JSON array? If a later normal node matches first, it will be returned instead.

6. **Excludes cross-contamination:** The `excludes` check looks at BOTH `session.visited` and `session.flags`. If a flag name accidentally matches a node_id, it could cause false exclusions. Use distinct naming: flags use `snake_case` descriptors (`no_gateway`, `missed_expiry`), node_ids use `step_N` prefix.

---

## Scenario authoring checklist for butterfly effect

- [ ] Wrong choice has `sets_flags: ["descriptive_flag_name"]`
- [ ] Wrong choice has `timeline_event` describing the mistake
- [ ] Consequence node has `requires_flags: ["descriptive_flag_name"]` (exact match)
- [ ] Consequence node has `timeline_event` describing the consequence and linking back to cause
- [ ] Consequence node is placed AFTER all normal steps in the JSON array
- [ ] Flag name does not collide with any `node_id` in the scenario
- [ ] Correct choice on the same step does NOT set the same flag
- [ ] If consequence node has `excludes`, verify they don't accidentally block it
