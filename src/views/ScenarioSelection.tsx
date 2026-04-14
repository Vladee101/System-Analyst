import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from '@tauri-apps/api/core';

interface ScenarioMeta {
  scenario_id: string;
  title: string;
  level: string;
  description: string;
  skills_tracked: string[];
}

interface ScenarioCompletion {
  scenario_id: string;
  best_percentage: number;
  best_grade: string;
  attempts: number;
  last_completed: string;
}

const getLevelColorClasses = (level: string) => {
  const l = level.toLowerCase();
  if (l.includes('junior')) return 'bg-blue-100 text-blue-800';
  if (l.includes('middle')) return 'bg-green-100 text-green-800';
  if (l.includes('senior')) return 'bg-red-100 text-red-800';
  return 'bg-blue-100 text-blue-800'; // Default
};

export function ScenarioSelection() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [completions, setCompletions] = useState<Record<string, ScenarioCompletion>>({});
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ScenarioMeta | null>(null);

  const fetchScenarios = async () => {
    try {
      const list = await invoke<ScenarioMeta[]>('list_scenarios');
      setScenarios(list);
      
      const compData = await invoke<ScenarioCompletion[]>('get_completions');
      const compMap: Record<string, ScenarioCompletion> = {};
      compData.forEach(c => { compMap[c.scenario_id] = c; });
      setCompletions(compMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (e: React.MouseEvent, scenario: ScenarioMeta) => {
    e.stopPropagation();
    setDeleteTarget(scenario);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoke('delete_scenario', { id: deleteTarget.scenario_id });
      setDeleteTarget(null);
      fetchScenarios();
    } catch (err) {
      console.error('Failed to delete scenario:', err);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    fetchScenarios();
    window.addEventListener('scenarioImported', fetchScenarios);
    return () => window.removeEventListener('scenarioImported', fetchScenarios);
  }, []);

  return (
    <div className="flex-1 p-8">
      <h2 className="text-2xl font-semibold mb-6">Доступные Сценарии</h2>
      
      {loading ? (
        <p className="text-gray-500">Загрузка сценариев...</p>
      ) : scenarios.length === 0 ? (
        <p className="text-gray-500">Нет доступных сценариев. Пожалуйста, импортируйте сценарий (JSON) через кнопку в меню выше.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map(s => (
            <div key={s.scenario_id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col" onClick={() => navigate(`/play/${s.scenario_id}`)}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{s.title || s.scenario_id}</h3>
                  {completions[s.scenario_id] && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            completions[s.scenario_id].best_percentage >= 70 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {Math.round(completions[s.scenario_id].best_percentage)}% — {completions[s.scenario_id].best_grade}
                        </span>
                        <span className="text-xs text-gray-400">
                            {completions[s.scenario_id].attempts} {completions[s.scenario_id].attempts === 1 ? 'попытка' : 'попыток'}
                        </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {s.level && (
                    <span className={`${getLevelColorClasses(s.level)} text-xs px-2 py-1 rounded-full font-medium uppercase`}>
                      {s.level}
                    </span>
                  )}
                  <button
                    onClick={(e) => openDeleteDialog(e, s)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                    title="Удалить сценарий"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">{s.description}</p>
              
              {s.skills_tracked && s.skills_tracked.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto">
                  {s.skills_tracked.map(skill => (
                    <span key={skill} className="text-xs text-gray-400 border px-2 py-1 rounded">
                      {skill.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              animation: 'modalIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning icon */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              Удалить сценарий?
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px', lineHeight: 1.5 }}>
              «{deleteTarget.title || deleteTarget.scenario_id}» будет удалён без возможности восстановления.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
