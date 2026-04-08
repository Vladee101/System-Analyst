# Feature Spec: Consequence Banner

## Goal

When a student reaches a consequence node (a node that only appears because they made a mistake earlier), show a visible warning banner in the Context Panel:

```
⚠️ Это последствие вашего решения на шаге 3
```

The banner tells the student WHY this node appeared and connects it back to the original mistake.

---

## Current behavior

Consequence nodes look identical to normal nodes. The student sees a new step but doesn't know it exists only because of their earlier mistake. The timeline panel shows events but is collapsed by default.

---

## Required changes

### 1. Rust: Track flag origins in SessionState

**File:** `src-tauri/src/models.rs`

Add a new field to `SessionState` that maps each flag to the step number where it was set:

```rust
pub struct SessionState {
    // ... existing fields ...
    pub flag_origins: HashMap<String, usize>,  // flag_name → step_number (1-based)
}
```

Make sure `flag_origins` is included in `Default` impl with an empty HashMap.

### 2. Rust: Record flag origins in submit_choice

**File:** `src-tauri/src/commands.rs`

In `submit_choice`, when adding a flag, also record which step set it. The step number is the count of visited nodes at that point:

```rust
// Inside submit_choice, where flags are applied:
for flag in &choice.sets_flags {
    if !session.flags.contains(flag) {
        session.flags.push(flag.clone());
        // Record which step number set this flag
        let step_number = session.visited.len();
        session.flag_origins.insert(flag.clone(), step_number);
    }
}
```

This applies to BOTH the ordering branch and the single/multi branch — add it in both places.

### 3. Rust: Return consequence info from get_next_node

**File:** `src-tauri/src/commands.rs`

Change `get_next_node` return type to include consequence metadata. Create a new struct:

```rust
#[derive(serde::Serialize, Clone)]
pub struct NodeWithMeta {
    #[serde(flatten)]
    pub node: Node,
    pub is_consequence: bool,
    pub consequence_of_step: Option<usize>,  // 1-based step number
}
```

In `get_next_node`, after finding the next node, check if it has `requires_flags`. If ALL of its `requires_flags` were set by player choices (exist in `flag_origins`), it's a consequence node:

```rust
if let Some(n) = next_node {
    session.current_node = Some(n.node_id.clone());
    session.visited.push(n.node_id.clone());
    
    // Check if this is a consequence node
    let is_consequence = !n.requires_flags.is_empty();
    let consequence_of_step = if is_consequence {
        // Find the earliest step that set any of the required flags
        n.requires_flags.iter()
            .filter_map(|f| session.flag_origins.get(f))
            .min()
            .copied()
    } else {
        None
    };
    
    Ok(Some(NodeWithMeta {
        node: n.clone(),
        is_consequence,
        consequence_of_step,
    }))
} else {
    Ok(None)
}
```

**Important:** Also update `get_current_node` to return `NodeWithMeta` with the same logic, so the banner shows correctly on page refresh.

### 4. Rust: Update debug_session

**File:** `src-tauri/src/commands.rs`

Add `flag_origins` to the `DebugInfo` struct so it shows in console:

```rust
pub struct DebugInfo {
    // ... existing fields ...
    pub flag_origins: HashMap<String, usize>,
}
```

### 5. Frontend: Update TypeScript types

**File:** `src/store/useScenarioStore.ts`

Update `NodeData` interface to include consequence metadata:

```typescript
export interface NodeData {
    // ... existing fields ...
    is_consequence: boolean;
    consequence_of_step: number | null;
}
```

No changes needed to store logic — it already passes through whatever Rust returns.

### 6. Frontend: Show banner in ScenarioWorkspace

**File:** `src/views/ScenarioWorkspace.tsx`

In the Context Panel (left panel), add a banner ABOVE the context text when the node is a consequence:

```tsx
{/* Context Panel */}
<div className="w-1/4 border-r border-gray-200 bg-white p-6 overflow-y-auto">
    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Контекст</h3>
    
    {/* Consequence banner */}
    {currentNode?.is_consequence && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2">
            <span className="text-amber-600 text-lg leading-none mt-0.5">⚠️</span>
            <div>
                <p className="text-sm font-medium text-amber-800">Отложенное последствие</p>
                <p className="text-xs text-amber-700 mt-0.5">
                    Это результат вашего решения на шаге {currentNode.consequence_of_step}
                </p>
            </div>
        </div>
    )}
    
    <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
        {currentNode?.context}
    </p>
</div>
```

### 7. Frontend: Auto-expand timeline on consequence

In the same file, when a consequence node appears, automatically expand the timeline panel so the student sees the cause-effect chain:

```tsx
// Add to the useEffect that watches currentNode changes:
useEffect(() => {
    // ... existing zoom/pan reset ...
    
    // Auto-expand timeline when consequence node appears
    if (currentNode?.is_consequence) {
        setTimelineOpen(true);
    }
}, [currentNode?.node_id]);
```

---

## Files to modify (summary)

| File | Change |
|---|---|
| `src-tauri/src/models.rs` | Add `flag_origins: HashMap<String, usize>` to SessionState |
| `src-tauri/src/commands.rs` | Record flag origins in `submit_choice`, return `NodeWithMeta` from `get_next_node` and `get_current_node`, update `DebugInfo` |
| `src/store/useScenarioStore.ts` | Add `is_consequence` and `consequence_of_step` to `NodeData` interface |
| `src/views/ScenarioWorkspace.tsx` | Add consequence banner in context panel, auto-expand timeline |

## Files NOT to modify

- Scenario JSON files — no schema changes needed
- `SCENARIO_AUTHORING_GUIDE.md` — no new fields for authors
- `MASTER_PROMPT.md` — no changes to scenario format

---

## Testing

1. Load `task-bpmn-order-fulfillment` scenario
2. On step 3, choose the WRONG answer (no gateway — `s3_c2`)
3. Continue to the end
4. Verify: `step_10_consequence_no_gateway` shows with amber banner saying "Это результат вашего решения на шаге 3"
5. Verify: timeline panel auto-expands when consequence appears
6. Replay scenario, on step 3 choose the CORRECT answer
7. Verify: `step_10_consequence_no_gateway` does NOT appear at all
8. Check console `[DEBUG]` logs: `flag_origins` should show `{"no_gateway": 3}` after step 3

---

## Edge cases

- **Multiple requires_flags:** If a consequence node requires 2 flags set on different steps, show the EARLIEST step number in the banner.
- **Consequence at step 1:** Theoretically impossible (no prior steps to cause it), but handle gracefully — show banner without step number.
- **Node with requires_flags but not a real consequence:** Some nodes use `requires_flags` for normal branching (e.g., `step_2_full` requires `full_interview`). These are NOT consequences — they are expected paths. However, since the student chose to interview (correct choice), the banner saying "consequence of step 1" is still technically accurate and arguably helpful. If this feels wrong, add a `"is_consequence": true` boolean field to the JSON node schema to explicitly mark consequence nodes, and only show the banner for those.
