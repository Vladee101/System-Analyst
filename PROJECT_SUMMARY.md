# SA Simulator - Project Summary

## Executive Summary
**SA Simulator** is a deterministic, scenario-based training platform for System Analysts. It simulates daily workflows through an interactive graph engine where every decision has delayed consequences, unlocks branching paths, and alters a multi-dimensional skill vector.

## Tech Stack
- **Frontend**: React (vite), TypeScript, Tailwind CSS, Lucide React (icons)
- **Backend / Wrapper**: Tauri v2, Rust
- **Diagram Rendering**: Mermaid.js
- **Persistence / Data**: JSON files (Local filesystem)

## Project Structure
- **`/src/` (Frontend)**
  - `App.tsx`: Routing across Main Menu, Gameplay Workspace, and Results.
  - `views/`: Main screens (`MainLayout`, `ScenarioSelection`, `ScenarioWorkspace`, `ResultDashboard`).
  - `components/`: UI modules, including `Mermaid` for diagram rendering.
  - `store/`: State management handles scenario progression logic on the client.
- **`/src-tauri/src/` (Backend)**
  - `lib.rs`: Tauri builder and route configuration.
  - `commands.rs`: Core scenario engine. Handles file system access (`list_scenarios`, `save_scenario`, `delete_scenario`), logic processing (`submit_choice`, `get_next_node`), skill grading (`get_results`), and event timeline.
  - `models.rs`: Defines Rust struct shapes (Scenarios, Nodes, Choices, SessionState). 
- **`/scenarios/`**: Working directory where the application saves imported JSON scenarios.
- **`sa-simulator-prd.md`**: The Product Requirements Document.

## Features Implemented (Phase 1 / MVP)
The project currently fulfills the core Phase 1 MVP requirements:

### 1. Scenario Engine (Rust Backend)
- **JSON Loading & Saving:** Reading scenario schemes and tracking game sessions.
- **Graph Bridging logic:** Progressing node-by-node based on calculated flags (`requires_flags` and `excludes`).
- **Dynamic Scoring:** Modifying skill vectors based on the user's answers.
- **Timeline Engine:** Mapping earlier decisions to their delayed consequences.

### 2. UI & Frontend
- **Scenario Management:** 
  - Dynamic "Import Scenario" feature from JSON files.
  - List available scenarios with difficulty badging and trackable skills mapping.
  - Delete scenario capability.
  - **Polished UI Modals:** Replaced native `alert()` and `window.confirm()` calls with beautifully-styled overlay modals (with backdrop blurs, icons, and animations).
- **Interactive Workspace:**
  - **Context Panel:** Text-based situation constraints.
  - **Artifact Viewer:** Dynamically renders scenario artifacts. Supports raw tables and Mermaid diagrams.
  - **Decision Panel:** Handles `single_choice`, `multi_select`, and `ordering` question types.
- **Results Dashboard:** 
  - Generates a final grade (percentage-based).
  - Offers personalized recommendations based on the user's weakest skill dimensions.
  - Exposes the full timeline of the user's butterfly-effect decisions.

### 3. Polish & Packaging
- Successfully replaced the default Tauri apps icon with a custom, generated briefcase icon across all platforms using Tauri's icon generator.

## Upcoming Scope (Phase 2 & 3)
Moving forward, functionality will be expanded to encompass intermediate and senior requirements:

1. **New Artifact Displays:** Sequence Diagrams, ER schemas, API contracts, C4 topologies, and ADRs.
2. **New Node Capabilities:** 
   - `drag_classification`: Interactive dragging for Requirements Traceability Matrices.
   - `diagram_analysis`: Selecting flaws directly on an SVG representation of an architecture.
   - `artifact_review`: Highlighting API contract issues directly inside the app.
3. **Advanced Scenarios:** Implementation of "Middle" and "Senior" level scenarios (e.g., monolith migrations, cross-service workflows).
4. **Data Persistence:** Migration from ad-hoc json loading to SQLite or robust DB.
