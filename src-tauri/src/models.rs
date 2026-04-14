use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scenario {
    pub scenario_id: String,
    pub title: String,
    pub level: String,
    pub pack: String,
    pub description: String,
    pub skills_tracked: Vec<String>,
    pub nodes: Vec<Node>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub node_id: String,
    pub node_type: String, // single_choice, multi_select, etc
    pub stage: String,
    pub context: String,
    pub context_artifact: Option<Artifact>,
    pub requires_flags: Vec<String>,
    pub excludes: Vec<String>,
    pub choices: Vec<Choice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artifact {
    #[serde(rename = "type")]
    pub artifact_type: String, // diagram, table, etc
    pub data: serde_json::Value, // SVG, mermaid string, or JSON structure
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Choice {
    pub id: String,
    pub text: String,
    pub correct: bool,
    pub skill_effects: HashMap<String, f32>,
    pub sets_flags: Vec<String>,
    pub feedback: Option<String>,
    pub timeline_event: Option<String>,
    pub correct_rank: Option<u32>,
    pub element_selector: Option<String>,
    pub correct_category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionState {
    pub scenario_id: Option<String>,
    pub current_node: Option<String>,
    pub visited: Vec<String>,
    pub flags: Vec<String>,
    pub flag_origins: HashMap<String, usize>,
    pub skill_vector: HashMap<String, f32>,
    pub max_possible_skills: HashMap<String, f32>,
    pub timeline: Vec<String>,
}
