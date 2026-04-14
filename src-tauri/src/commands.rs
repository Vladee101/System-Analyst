use crate::models::{Node, Scenario, SessionState};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

use rusqlite::Connection;

pub struct AppState {
    pub session: Mutex<SessionState>,
    pub scenarios: Mutex<HashMap<String, Scenario>>,
    pub db: Mutex<Connection>,
}

#[derive(serde::Serialize, Clone)]
pub struct NodeWithMeta {
    #[serde(flatten)]
    pub node: Node,
    pub is_consequence: bool,
    pub consequence_of_step: Option<usize>,
}

#[tauri::command]
pub fn load_scenario(
    id: String,
    state: State<'_, AppState>,
    _app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let mut path = std::env::current_dir().map_err(|e| e.to_string())?;

    if path.ends_with("src-tauri") {
        path.pop();
    }
    path.push("scenarios");
    path.push(format!("{}.json", id));

    let file_content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    let scenario: Scenario =
        serde_json::from_str(&file_content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut session = state.session.lock().unwrap();
    *session = SessionState::default();
    session.scenario_id = Some(id.clone());

    if let Some(first_node) = scenario.nodes.first() {
        session.current_node = Some(first_node.node_id.clone());
        session.visited.push(first_node.node_id.clone());
    }

    let mut scenarios = state.scenarios.lock().unwrap();
    scenarios.insert(id.clone(), scenario);

    Ok(format!("Scenario {} loaded", id))
}

#[tauri::command]
pub fn get_current_node(state: State<'_, AppState>) -> Result<NodeWithMeta, String> {
    let session = state.session.lock().unwrap();
    let scenarios = state.scenarios.lock().unwrap();

    let scenario_id = session.scenario_id.as_ref().ok_or("No scenario loaded")?;
    let scenario = scenarios
        .get(scenario_id)
        .ok_or("Scenario data not found")?;
    let current_node_id = session.current_node.as_ref().ok_or("No active node")?;

    let node = scenario
        .nodes
        .iter()
        .find(|n| &n.node_id == current_node_id)
        .ok_or("Node not found in scenario")?;

    let is_consequence = !node.requires_flags.is_empty();
    let consequence_of_step = if is_consequence {
        node.requires_flags
            .iter()
            .filter_map(|f| session.flag_origins.get(f))
            .min()
            .copied()
    } else {
        None
    };

    Ok(NodeWithMeta {
        node: node.clone(),
        is_consequence,
        consequence_of_step,
    })
}

#[tauri::command]
pub fn submit_choice(
    choice_ids: Vec<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut session = state.session.lock().unwrap();
    let scenarios = state.scenarios.lock().unwrap();

    let scenario_id = session.scenario_id.as_ref().ok_or("No scenario loaded")?;
    let scenario = scenarios
        .get(scenario_id)
        .ok_or("Scenario data not found")?;
    let current_node_id = session.current_node.as_ref().ok_or("No active node")?;

    let node = scenario
        .nodes
        .iter()
        .find(|n| &n.node_id == current_node_id)
        .ok_or("Node not found in scenario")?;

    if node.node_type == "ordering" {
        // ORDERING: choice_ids arrive in the order the student placed them (index 0 = rank 1)
        // Compare each item's submitted position against its correct_rank
        let mut correct_count: u32 = 0;
        let total_items = choice_ids.len() as u32;

        for (submitted_index, chosen_id) in choice_ids.iter().enumerate() {
            if let Some(choice) = node.choices.iter().find(|c| &c.id == chosen_id) {
                let submitted_rank = (submitted_index + 1) as u32;
                let expected_rank = choice.correct_rank.unwrap_or(0);

                if submitted_rank == expected_rank {
                    correct_count += 1;
                    // Apply full skill effects for correct position
                    for (skill, delta) in &choice.skill_effects {
                        let current = session.skill_vector.entry(skill.clone()).or_insert(0.0);
                        *current += delta;
                    }
                }
                // Note: incorrect position gets 0 points, no penalty

                // Apply flags regardless of position (ordering flags are unconditional)
                for flag in &choice.sets_flags {
                    if !session.flags.contains(flag) {
                        session.flags.push(flag.clone());
                        let step_number = session.visited.len();
                        session.flag_origins.insert(flag.clone(), step_number);
                    }
                }
                // Timeline
                if let Some(event) = &choice.timeline_event {
                    session.timeline.push(event.clone());
                }
            }
        }

        // Track max possible for ordering: sum of all positive skill_effects across all choices
        let mut best_per_skill: HashMap<String, f32> = HashMap::new();
        for choice in &node.choices {
            for (skill, delta) in &choice.skill_effects {
                if *delta > 0.0 {
                    let current_best = best_per_skill.entry(skill.clone()).or_insert(0.0);
                    *current_best += delta; // For ordering, max = sum of ALL choices (if all correct)
                }
            }
        }
        for (skill, max_delta) in &best_per_skill {
            let current_max = session
                .max_possible_skills
                .entry(skill.clone())
                .or_insert(0.0);
            *current_max += max_delta;
        }

        Ok(format!(
            "{} of {} items in correct position",
            correct_count, total_items
        ))
    } else if node.node_type == "drag_classification" {
        let mut correct_count: u32 = 0;
        let total_items = choice_ids.len() as u32;

        for encoded in &choice_ids {
            let parts: Vec<&str> = encoded.splitn(2, ':').collect();
            if parts.len() != 2 { continue; }
            let item_id = parts[0];
            let placed_category = parts[1];

            if let Some(choice) = node.choices.iter().find(|c| c.id == item_id) {
                let expected_category = choice.correct_category.as_deref().unwrap_or("");
                
                if placed_category == expected_category {
                    correct_count += 1;
                    // Apply full skill effects
                    for (skill, delta) in &choice.skill_effects {
                        let current = session.skill_vector.entry(skill.clone()).or_insert(0.0);
                        *current += delta;
                    }
                } else {
                    // Apply half penalty
                    for (skill, delta) in &choice.skill_effects {
                        let current = session.skill_vector.entry(skill.clone()).or_insert(0.0);
                        *current -= delta * 0.5;
                    }
                }

                // Apply flags
                for flag in &choice.sets_flags {
                    if !session.flags.contains(flag) {
                        session.flags.push(flag.clone());
                        let step_number = session.visited.len();
                        session.flag_origins.insert(flag.clone(), step_number);
                    }
                }
                // Timeline
                if let Some(event) = &choice.timeline_event {
                    session.timeline.push(event.clone());
                }
            }
        }

        // Track max possible for drag_classification: sum of all positive skill_effects
        let mut best_per_skill: HashMap<String, f32> = HashMap::new();
        for choice in &node.choices {
            for (skill, delta) in &choice.skill_effects {
                if *delta > 0.0 {
                    let current_best = best_per_skill.entry(skill.clone()).or_insert(0.0);
                    *current_best += delta;
                }
            }
        }
        for (skill, max_delta) in &best_per_skill {
            let current_max = session.max_possible_skills.entry(skill.clone()).or_insert(0.0);
            *current_max += max_delta;
        }

        Ok(format!("{} of {} items correctly classified", correct_count, total_items))
    } else {
        // SINGLE_CHOICE / MULTI_SELECT / DIAGRAM_ANALYSIS / ARTIFACT_REVIEW
        for chosen_id in &choice_ids {
            if let Some(choice) = node.choices.iter().find(|c| &c.id == chosen_id) {
                // Apply flags
                for flag in &choice.sets_flags {
                    if !session.flags.contains(flag) {
                        session.flags.push(flag.clone());
                        let step_number = session.visited.len();
                        session.flag_origins.insert(flag.clone(), step_number);
                    }
                }
                // Apply skills
                for (skill, delta) in &choice.skill_effects {
                    let current = session.skill_vector.entry(skill.clone()).or_insert(0.0);
                    *current += delta;
                }
                // Timeline
                if let Some(event) = &choice.timeline_event {
                    session.timeline.push(event.clone());
                }
            } else if node.node_type == "artifact_review" || node.node_type == "multi_select" {
                // False positive: student selected an item not in choices
                if let Some(first_skill) = node.choices.first()
                    .and_then(|c| c.skill_effects.keys().next()) {
                    let current = session.skill_vector.entry(first_skill.clone()).or_insert(0.0);
                    *current -= 0.5;
                }
            }
        }

        // Compute max possible scores for this node
        let mut best_per_skill: HashMap<String, f32> = HashMap::new();
        for choice in &node.choices {
            for (skill, delta) in &choice.skill_effects {
                if *delta > 0.0 {
                    let current_best = best_per_skill.entry(skill.clone()).or_insert(0.0);
                    if *delta > *current_best {
                        *current_best = *delta;
                    }
                }
            }
        }
        for (skill, max_delta) in &best_per_skill {
            let current_max = session
                .max_possible_skills
                .entry(skill.clone())
                .or_insert(0.0);
            *current_max += max_delta;
        }

        Ok("Choices processed".to_string())
    }
}

#[tauri::command]
pub fn get_next_node(state: State<'_, AppState>) -> Result<Option<NodeWithMeta>, String> {
    let mut session = state.session.lock().unwrap();
    let scenarios = state.scenarios.lock().unwrap();

    let scenario_id = session.scenario_id.as_ref().ok_or("No scenario loaded")?;
    let scenario = scenarios
        .get(scenario_id)
        .ok_or("Scenario data not found")?;

    let next_node = scenario.nodes.iter().find(|n| {
        if session.visited.contains(&n.node_id) {
            return false;
        }

        let requires_met = n.requires_flags.iter().all(|f| session.flags.contains(f));
        let excludes_met = !n
            .excludes
            .iter()
            .any(|f| session.visited.contains(f) || session.flags.contains(f));

        requires_met && excludes_met
    });

    if let Some(n) = next_node {
        session.current_node = Some(n.node_id.clone());
        session.visited.push(n.node_id.clone());

        let is_consequence = !n.requires_flags.is_empty();
        let consequence_of_step = if is_consequence {
            n.requires_flags
                .iter()
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
}

#[tauri::command]
pub fn get_scenario_json(id: String) -> Result<String, String> {
    let mut path = std::env::current_dir().map_err(|e| e.to_string())?;

    if path.ends_with("src-tauri") {
        path.pop();
    }
    path.push("scenarios");
    path.push(format!("{}.json", id));

    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn save_scenario(id: String, content: String) -> Result<(), String> {
    // Validate that content is a valid Scenario JSON
    let _scenario: crate::models::Scenario = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid scenario format: {}", e))?;

    let mut path = std::env::current_dir().map_err(|e| e.to_string())?;

    if path.ends_with("src-tauri") {
        path.pop();
    }
    path.push("scenarios");

    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    path.push(format!("{}.json", id));

    std::fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn delete_scenario(id: String) -> Result<(), String> {
    let mut path = std::env::current_dir().map_err(|e| e.to_string())?;

    if path.ends_with("src-tauri") {
        path.pop();
    }
    path.push("scenarios");
    path.push(format!("{}.json", id));

    if !path.exists() {
        return Err(format!("Scenario file not found: {}", path.display()));
    }

    std::fs::remove_file(&path).map_err(|e| format!("Failed to delete scenario: {}", e))
}

#[derive(serde::Serialize)]
pub struct ScenarioMeta {
    pub scenario_id: String,
    pub title: String,
    pub level: String,
    pub description: String,
    pub skills_tracked: Vec<String>,
}

#[tauri::command]
pub fn list_scenarios() -> Result<Vec<ScenarioMeta>, String> {
    let mut path = std::env::current_dir().map_err(|e| e.to_string())?;
    if path.ends_with("src-tauri") {
        path.pop();
    }
    path.push("scenarios");

    let mut metas = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() && p.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = std::fs::read_to_string(&p) {
                    if let Ok(scenario) = serde_json::from_str::<crate::models::Scenario>(&content)
                    {
                        metas.push(ScenarioMeta {
                            scenario_id: scenario.scenario_id,
                            title: scenario.title,
                            level: scenario.level,
                            description: scenario.description,
                            skills_tracked: scenario.skills_tracked,
                        });
                    }
                }
            }
        }
    }

    Ok(metas)
}

#[derive(serde::Serialize, Clone)]
pub struct SkillResult {
    pub skill: String,
    pub earned: f32,
    pub max_possible: f32,
    pub percentage: f32,
}

#[derive(serde::Serialize)]
pub struct ScenarioResults {
    pub scenario_title: String,
    pub overall_percentage: f32,
    pub grade: String,
    pub skills: Vec<SkillResult>,
    pub recommendations: Vec<String>,
    pub timeline: Vec<String>,
    pub nodes_visited: usize,
}

#[tauri::command]
pub fn get_results(state: State<'_, AppState>) -> Result<ScenarioResults, String> {
    let session = state.session.lock().unwrap();
    let scenarios = state.scenarios.lock().unwrap();

    let scenario_id = session.scenario_id.as_ref().ok_or("No scenario loaded")?;
    let scenario = scenarios
        .get(scenario_id)
        .ok_or("Scenario data not found")?;

    let mut skills: Vec<SkillResult> = Vec::new();
    let mut total_earned: f32 = 0.0;
    let mut total_max: f32 = 0.0;

    for skill_name in &scenario.skills_tracked {
        let earned = *session.skill_vector.get(skill_name).unwrap_or(&0.0);
        let max_possible = *session.max_possible_skills.get(skill_name).unwrap_or(&1.0);
        let max_possible = if max_possible <= 0.0 {
            1.0
        } else {
            max_possible
        };
        let pct = (earned / max_possible * 100.0).clamp(0.0, 100.0);

        total_earned += earned.max(0.0);
        total_max += max_possible;

        skills.push(SkillResult {
            skill: skill_name.clone(),
            earned,
            max_possible,
            percentage: pct,
        });
    }

    let overall_pct = if total_max > 0.0 {
        (total_earned / total_max * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    let grade = match overall_pct as u32 {
        85..=100 => "Отлично",
        70..=84 => "Хорошо",
        50..=69 => "Удовлетворительно",
        _ => "Требуется практика",
    }
    .to_string();

    let mut recommendations = Vec::new();
    let mut sorted_skills = skills.clone();
    sorted_skills.sort_by(|a, b| a.percentage.partial_cmp(&b.percentage).unwrap());
    for s in sorted_skills.iter().take(2) {
        if s.percentage < 70.0 {
            let rec = match s.skill.as_str() {
                "stakeholder_communication" => "Уделите больше внимания интервьюированию стейкхолдеров и сбору требований с разных сторон.",
                "scope_control" => "Практикуйте управление скоупом — записывайте будущие улучшения отдельно и защищайте текущий скоуп.",
                "requirement_quality" => "Работайте над качеством ФТ/НФТ — требования должны быть конкретными, измеримыми и полными.",
                "nfr_awareness" => "Обратите внимание на нефункциональные требования — задержки, безопасность, надёжность.",
                "diagram_accuracy" => "Тренируйте навыки ревью диаграмм — ищите пропущенные состояния, пути ошибок и альтернативные потоки.",
                "traceability" => "Изучайте RTM — практикуйте маппинг требований к компонентам и тестам.",
                "integration_awareness" => "Углубитесь в паттерны интеграции — идемпотентность, retry, таймауты, HMAC-верификация.",
                "data_modeling" => "Изучайте проектирование данных — нормализация, миграции, ER-диаграммы.",
                "api_design" => "Практикуйте проектирование API — контракты, версионирование, обработка ошибок.",
                _ => "Продолжайте практику в этой области.",
            };
            recommendations.push(rec.to_string());
        }
    }

    Ok(ScenarioResults {
        scenario_title: scenario.title.clone(),
        overall_percentage: overall_pct,
        grade,
        skills,
        recommendations,
        timeline: session.timeline.clone(),
        nodes_visited: session.visited.len(),
    })
}

#[tauri::command]
pub fn get_timeline(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let session = state.session.lock().unwrap();
    Ok(session.timeline.clone())
}

#[tauri::command]
pub fn save_results(state: State<'_, AppState>) -> Result<(), String> {
    let session = state.session.lock().unwrap();
    let scenarios = state.scenarios.lock().unwrap();
    let db = state.db.lock().unwrap();

    let scenario_id = session.scenario_id.as_ref().ok_or("No scenario loaded")?;
    let scenario = scenarios.get(scenario_id).ok_or("Scenario not found")?;

    let mut total_earned: f32 = 0.0;
    let mut total_max: f32 = 0.0;
    let mut skills_vec = Vec::new();

    for skill_name in &scenario.skills_tracked {
        let earned = *session.skill_vector.get(skill_name).unwrap_or(&0.0);
        let max_possible = *session.max_possible_skills.get(skill_name).unwrap_or(&1.0);
        let max_possible = if max_possible <= 0.0 { 1.0 } else { max_possible };
        let pct = (earned / max_possible * 100.0).clamp(0.0, 100.0);
        total_earned += earned.max(0.0);
        total_max += max_possible;
        skills_vec.push(serde_json::json!({
            "skill": skill_name,
            "earned": earned,
            "max": max_possible,
            "pct": pct
        }));
    }

    let overall_pct = if total_max > 0.0 {
        (total_earned / total_max * 100.0).clamp(0.0, 100.0)
    } else { 0.0 };

    let grade = match overall_pct as u32 {
        85..=100 => "Отлично",
        70..=84 => "Хорошо",
        50..=69 => "Удовлетворительно",
        _ => "Требуется практика",
    };

    let now = chrono::Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO scenario_results (scenario_id, completed_at, overall_percentage, grade, nodes_visited, skills_json, timeline_json, flags_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            scenario_id,
            now,
            overall_pct,
            grade,
            session.visited.len(),
            serde_json::to_string(&skills_vec).unwrap(),
            serde_json::to_string(&session.timeline).unwrap(),
            serde_json::to_string(&session.flags).unwrap(),
        ],
    ).map_err(|e| format!("Failed to save results: {}", e))?;

    Ok(())
}

#[derive(serde::Serialize)]
pub struct ScenarioCompletion {
    pub scenario_id: String,
    pub best_percentage: f32,
    pub best_grade: String,
    pub attempts: u32,
    pub last_completed: String,
}

#[tauri::command]
pub fn get_completions(state: State<'_, AppState>) -> Result<Vec<ScenarioCompletion>, String> {
    let db = state.db.lock().unwrap();

    let mut stmt = db.prepare("
        SELECT 
            scenario_id,
            MAX(overall_percentage) as best_pct,
            COUNT(*) as attempts,
            MAX(completed_at) as last_completed
        FROM scenario_results
        GROUP BY scenario_id
    ").map_err(|e| e.to_string())?;

    let completions = stmt.query_map([], |row| {
        let best_pct: f32 = row.get(1)?;
        let grade = match best_pct as u32 {
            85..=100 => "Отлично",
            70..=84 => "Хорошо",
            50..=69 => "Удовлетворительно",
            _ => "Требуется практика",
        };
        Ok(ScenarioCompletion {
            scenario_id: row.get(0)?,
            best_percentage: best_pct,
            best_grade: grade.to_string(),
            attempts: row.get(2)?,
            last_completed: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    completions.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
