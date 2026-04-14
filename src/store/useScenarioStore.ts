import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface Artifact {
  type: string;
  data: any;
}

export interface Choice {
  id: string;
  text: string;
  correct: boolean;
  feedback: string | null;
  correct_rank?: number;
  element_selector?: string;
  correct_category?: string;
}

export interface NodeData {
  node_id: string;
  node_type: string;
  stage: string;
  context: string;
  context_artifact: Artifact | null;
  choices: Choice[];
  is_consequence: boolean;
  consequence_of_step: number | null;
}

interface ScenarioState {
  currentScenario: string | null;
  currentNode: NodeData | null;
  flags: string[];
  skillVector: Record<string, number>;
  loading: boolean;
  error: string | null;
  loadScenario: (id: string) => Promise<void>;
  fetchCurrentNode: () => Promise<void>;
  submitChoices: (choiceIds: string[]) => Promise<void>;
  advanceNode: () => Promise<void>;
  reset: () => void;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  currentScenario: null,
  currentNode: null,
  flags: [],
  skillVector: {},
  loading: false,
  error: null,

  reset: () => {
    set({
      currentScenario: null,
      currentNode: null,
      flags: [],
      skillVector: {},
      loading: false,
      error: null,
    });
  },

  loadScenario: async (id) => {
    // Reset everything before loading — prevents stale currentNode from previous session
    set({
      loading: true,
      error: null,
      currentNode: null,
      currentScenario: null,
      flags: [],
      skillVector: {},
    });
    try {
      await invoke('load_scenario', { id });
      set({ currentScenario: id });
    } catch (err: any) {
      set({ error: err.toString() });
    } finally {
      set({ loading: false });
    }
  },

  fetchCurrentNode: async () => {
    set({ loading: true, error: null });
    try {
      const node: NodeData = await invoke('get_current_node');
      set({ currentNode: node });
    } catch (err: any) {
      set({ error: err.toString() });
    } finally {
      set({ loading: false });
    }
  },

  submitChoices: async (choiceIds) => {
    set({ loading: true, error: null });
    try {
      await invoke('submit_choice', { choiceIds });
    } catch (err: any) {
      set({ error: err.toString() });
    } finally {
      set({ loading: false });
    }
  },

  advanceNode: async () => {
    set({ loading: true, error: null });
    try {
      const nextNode: NodeData | null = await invoke('get_next_node');
      if (nextNode) {
        set({ currentNode: nextNode });
      } else {
        set({ currentNode: null });
      }
    } catch (err: any) {
      set({ error: err.toString() });
    } finally {
      set({ loading: false });
    }
  },
}));