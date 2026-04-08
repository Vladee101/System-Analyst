import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { RotateCcw, Home, Trophy, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface SkillResult {
  skill: string;
  earned: number;
  max_possible: number;
  percentage: number;
}

interface ScenarioResults {
  scenario_title: string;
  overall_percentage: number;
  grade: string;
  skills: SkillResult[];
  recommendations: string[];
  timeline: string[];
  nodes_visited: number;
}

const SKILL_LABELS: Record<string, string> = {
  stakeholder_communication: "Коммуникация со стейкхолдерами",
  scope_control: "Управление скоупом",
  requirement_quality: "Качество требований",
  nfr_awareness: "Понимание НФТ",
  diagram_accuracy: "Точность диаграмм",
  traceability: "Трассируемость",
  integration_awareness: "Интеграционное мышление",
  data_modeling: "Моделирование данных",
  api_design: "Проектирование API",
  architecture_reasoning: "Архитектурное мышление",
  risk_prediction: "Предвидение рисков",
};

const GRADE_COLORS: Record<string, string> = {
  "Отлично": "text-green-600 bg-green-50 border-green-200",
  "Хорошо": "text-blue-600 bg-blue-50 border-blue-200",
  "Удовлетворительно": "text-yellow-600 bg-yellow-50 border-yellow-200",
  "Требуется практика": "text-red-600 bg-red-50 border-red-200",
};

function getBarColor(pct: number): string {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

export function ResultDashboard() {
  const navigate = useNavigate();
  const [results, setResults] = useState<ScenarioResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    invoke<ScenarioResults>("get_results")
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const scenarioId = window.location.pathname.split("/result/")[1];

  const handleRetry = () => {
    if (navigating) return;
    setNavigating(true);
    if (scenarioId) {
      navigate(`/play/${scenarioId}`);
    } else {
      navigate('/menu');
    }
  };

  const handleHome = () => {
    if (navigating) return;
    setNavigating(true);
    navigate('/menu');
  };

  if (loading) return <div className="p-8 text-gray-500">Подготовка результатов...</div>;
  if (!results) return <div className="p-8 text-red-500">Не удалось загрузить результаты</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <Trophy className="w-12 h-12 mx-auto text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-800">{results.scenario_title}</h2>
          <p className="text-sm text-gray-500">Пройдено шагов: {results.nodes_visited}</p>
        </div>

        {/* Overall Score + Grade */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-5xl font-bold text-gray-800 mb-2">{Math.round(results.overall_percentage)}%</div>
          <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold border ${GRADE_COLORS[results.grade] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
            {results.grade}
          </div>
        </div>

        {/* Skill Bars */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Навыки</h3>
          <div className="space-y-4">
            {results.skills.map(s => (
              <div key={s.skill}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{SKILL_LABELS[s.skill] || s.skill}</span>
                  <span className="text-gray-500">{Math.round(s.percentage)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${getBarColor(s.percentage)}`}
                    style={{ width: `${Math.max(s.percentage, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {results.recommendations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-yellow-500" />
              Рекомендации
            </h3>
            <ul className="space-y-2">
              {results.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-gray-700 pl-4 border-l-2 border-yellow-300">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Timeline */}
        {results.timeline.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() => setTimelineOpen(!timelineOpen)}
              className="w-full flex items-center justify-between font-semibold text-gray-800"
            >
              <span>Хронология решений ({results.timeline.length})</span>
              {timelineOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {timelineOpen && (
              <div className="mt-4 space-y-2">
                {results.timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-gray-700">{event}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center pb-8">
          <button
            onClick={handleRetry}
            disabled={navigating}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RotateCcw size={16} /> Пройти заново
          </button>
          <button
            onClick={handleHome}
            disabled={navigating}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Home size={16} /> В меню
          </button>
        </div>
      </div>
    </div>
  );
}