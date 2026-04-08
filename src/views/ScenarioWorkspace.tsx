import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useScenarioStore, Choice } from "../store/useScenarioStore";
import { Mermaid } from "../components/Mermaid";
import { ArrowUp, ArrowDown, ChevronUp, ChevronDown, Clock, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export function ScenarioWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loadScenario, fetchCurrentNode, currentNode, submitChoices, advanceNode, loading, error } = useScenarioStore();
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<{ text: string, correct: boolean, feedback: string }[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [orderedChoices, setOrderedChoices] = useState<Choice[]>([]);
  const [timeline, setTimeline] = useState<string[]>([]);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [stepNumber, setStepNumber] = useState(1);
  const [phase, setPhase] = useState<'loading' | 'playing' | 'finished'>('loading');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const artifactViewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = artifactViewerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomStep = 0.1;
        if (e.deltaY < 0) {
          setZoom(z => Math.min(3, z + zoomStep));
        } else {
          setZoom(z => Math.max(0.5, z - zoomStep));
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [phase, currentNode?.node_id]);

  const refreshTimeline = async () => {
    try {
      const tl = await invoke<string[]>('get_timeline');
      setTimeline(tl);
    } catch { /* ignore if no session */ }
  };


  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    setPhase('loading');
    setSelectedChoices([]);
    setFeedbackItems([]);
    setShowFeedback(false);
    setOrderedChoices([]);
    setTimeline([]);
    setTimelineOpen(false);
    setStepNumber(1);

    (async () => {
      try {
        await loadScenario(id);
        if (cancelled) return;
        await fetchCurrentNode();
        if (cancelled) return;
        setPhase('playing');
      } catch (e) {
        console.error('Failed to start scenario:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // Initialize ordering when node changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (currentNode?.node_type === 'ordering' && currentNode.choices) {
      const shuffled = [...currentNode.choices].sort(() => Math.random() - 0.5);
      setOrderedChoices(shuffled);
    }
    // Auto-expand timeline when consequence node appears
    if (currentNode?.is_consequence) {
      setTimelineOpen(true);
    }
  }, [currentNode?.node_id]);

  // Detect scenario end: only when we're playing and advanceNode returned null
  useEffect(() => {
    if (phase === 'playing' && !currentNode && !loading) {
      setPhase('finished');
      navigate(`/result/${id}`, { replace: true });
    }
  }, [currentNode, loading, phase]);

  if (phase === 'loading') return <div className="p-8">Загрузка сценария...</div>;
  if (phase === 'finished') return null;
  if (error) return <div className="p-8 text-red-500">Ошибка: {error}</div>;
  if (!currentNode) return <div className="p-8">Загрузка сценария...</div>;

  const isOrdering = currentNode?.node_type === 'ordering';

  const handleChoiceToggle = (choiceId: string) => {
    if (showFeedback) return;

    if (currentNode?.node_type === 'single_choice') {
      setSelectedChoices([choiceId]);
    } else {
      setSelectedChoices(prev =>
        prev.includes(choiceId) ? prev.filter(c => c !== choiceId) : [...prev, choiceId]
      );
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (showFeedback) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= orderedChoices.length) return;
    const updated = [...orderedChoices];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setOrderedChoices(updated);
  };

  const handleSubmit = async () => {
    if (showFeedback) {
      // Proceed to next node
      setShowFeedback(false);
      setFeedbackItems([]);
      setSelectedChoices([]);
      setOrderedChoices([]);
      setStepNumber(prev => prev + 1);
      await advanceNode();
    } else if (isOrdering && orderedChoices.length > 0) {
      const ids = orderedChoices.map(c => c.id);

      // Build feedback by comparing submitted position with correct_rank
      const items = orderedChoices.map((c, index) => {
        const submittedRank = index + 1;
        const expectedRank = c.correct_rank ?? 0;
        const isCorrectPosition = submittedRank === expectedRank;

        const positionInfo = isCorrectPosition
          ? `Позиция ${submittedRank} — верно.`
          : `Вы поставили на ${submittedRank}-е место, правильная позиция: ${expectedRank}.`;

        const reason = c.feedback ? c.feedback : '';
        const fullFeedback = reason ? `${positionInfo} ${reason}` : positionInfo;

        return {
          text: c.text,
          correct: isCorrectPosition,
          feedback: fullFeedback,
        };
      });

      await submitChoices(ids);
      await refreshTimeline();
      setFeedbackItems(items);
      setShowFeedback(true);
    } else if (selectedChoices.length > 0) {
      const allChoices = currentNode?.choices || [];

      // Feedback for selected choices
      const selectedItems = allChoices
        .filter(c => selectedChoices.includes(c.id))
        .map(c => ({
          text: c.text,
          correct: c.correct ?? false,
          feedback: c.feedback || '',
        }));

      // Find correct choices that were NOT selected
      const missedCorrect = allChoices
        .filter(c => c.correct && !selectedChoices.includes(c.id));

      const missedItems = missedCorrect.map(c => ({
        text: c.text,
        correct: false,
        feedback: c.feedback ? `Пропущено: ${c.feedback}` : 'Вы не выбрали этот правильный вариант.',
      }));

      const items = [...selectedItems, ...missedItems];

      // Add summary hint if some correct answers were missed but no wrong answers were selected
      const selectedWrong = allChoices.filter(c => selectedChoices.includes(c.id) && !c.correct);
      if (missedCorrect.length > 0 && selectedWrong.length === 0) {
        items.push({
          text: '',
          correct: false,
          feedback: `Вы не ошиблись, но выбрали не все правильные варианты (выбрано ${selectedChoices.length}, верных ${allChoices.filter(c => c.correct).length}).`,
        });
      }
      await submitChoices(selectedChoices);
      await refreshTimeline();
      setFeedbackItems(items);
      setShowFeedback(true);
    }
  };

  const canSubmit = showFeedback || (isOrdering && orderedChoices.length > 0) || selectedChoices.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{stepNumber}</span>
          <div className="font-semibold text-gray-800">{currentNode?.stage}</div>
        </div>
        <div className="text-sm text-gray-500">Шаг {stepNumber}</div>
      </div>

      <div className="flex-1 flex overflow-hidden">
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

        {/* Artifact Viewer (Center) */}
        <div className="flex-1 bg-gray-50 border-r border-gray-200 shadow-inner relative flex flex-col overflow-hidden">
          {currentNode?.context_artifact && (
            <div className="absolute top-4 right-4 z-10 flex gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors" title="Уменьшить">
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                title="Сбросить"
              >
                <Maximize size={16} />
              </button>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors" title="Увеличить">
                <ZoomIn size={16} />
              </button>
            </div>
          )}

          <div
            ref={artifactViewerRef}
            className={`flex-1 overflow-hidden p-6 flex flex-col items-center justify-center relative ${currentNode?.context_artifact ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            onMouseDown={(e) => {
              if (e.button !== 0 || !currentNode?.context_artifact) return; // Only left click and if artifact exists
              setIsDragging(true);
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            {!currentNode?.context_artifact && (
              <div className="text-gray-400 text-sm flex flex-col items-center gap-2 m-auto">
                <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                Нет активного артефакта
              </div>
            )}

            {currentNode?.context_artifact && (
              <div
                className="origin-center flex justify-center w-full select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-in-out'
                }}
              >
                {currentNode?.context_artifact?.type === 'diagram' && (
                  <Mermaid chart={currentNode.context_artifact.data as string} />
                )}

                {currentNode?.context_artifact?.type === 'table' && currentNode.context_artifact.data && (
                  <div className="w-full overflow-x-auto shadow-sm rounded-lg">
                    <table className="w-full text-sm border-collapse bg-white">
                      <thead>
                        <tr>
                          {(currentNode.context_artifact.data.headers || []).map((h: string, i: number) => (
                            <th key={i} className="border border-gray-200 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-700">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(currentNode.context_artifact.data.rows || []).map((row: string[], ri: number) => (
                          <tr key={ri} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                            {row.map((cell: string, ci: number) => (
                              <td key={ci} className={`border-r border-gray-100 last:border-0 px-4 py-2 text-gray-800 ${cell === '???' || cell === 'Не привязано' ? 'text-red-500 font-medium' : ''}`}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Decision Panel */}
        <div className="w-1/3 bg-white p-6 overflow-y-auto flex flex-col">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            {isOrdering ? 'Расположите в правильном порядке' : 'Решение'}
          </h3>
          {!showFeedback && !isOrdering && (
            <p className="text-xs text-gray-400 mb-4">
              {currentNode?.node_type === 'single_choice' ? 'Выберите один вариант' : 'Выберите один или несколько вариантов'}
            </p>
          )}
          {(showFeedback || isOrdering) && <div className="mb-3" />}

          {showFeedback ? (
            <div className="space-y-3 flex-1">
              <h4 className="font-semibold text-gray-800 mb-2">Обратная связь:</h4>
              {feedbackItems.map((item, idx) => {
                // Summary hint (no text, just feedback) — styled as info/warning
                if (!item.text) {
                  return (
                    <div key={idx} className="p-4 rounded-lg text-sm border bg-yellow-50 border-yellow-300">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">ℹ Подсказка</span>
                      </div>
                      <p className="text-gray-700">{item.feedback}</p>
                    </div>
                  );
                }
                // Missed correct answer — styled differently from wrong answers
                const isMissed = !item.correct && item.feedback.startsWith('Пропущено:');
                return (
                  <div key={idx} className={`p-4 rounded-lg text-sm border ${item.correct ? 'bg-green-50 border-green-300' : isMissed ? 'bg-orange-50 border-orange-300' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.correct ? 'bg-green-200 text-green-800' : isMissed ? 'bg-orange-200 text-orange-800' : 'bg-red-200 text-red-800'}`}>
                        {item.correct ? '✓ Верно' : isMissed ? '○ Пропущено' : '✗ Неверно'}
                      </span>
                    </div>
                    <p className="font-medium text-gray-800 mb-1">{item.text}</p>
                    {item.feedback && <p className="text-gray-600">{item.feedback}</p>}
                  </div>
                );
              })}
            </div>
          ) : isOrdering ? (
            /* Ordering UI */
            <div className="space-y-2 flex-1">
              {orderedChoices.map((choice, index) => (
                <div key={choice.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveItem(index, 1)}
                      disabled={index === orderedChoices.length - 1}
                      className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
                  <span className="text-sm text-gray-800">{choice.text}</span>
                </div>
              ))}
            </div>
          ) : (
            /* Single/Multi choice UI */
            <div className="space-y-3 flex-1">
              {currentNode?.choices.map(choice => {
                const isSelected = selectedChoices.includes(choice.id);
                return (
                  <div
                    key={choice.id}
                    onClick={() => handleChoiceToggle(choice.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors text-sm ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                  >
                    {choice.text}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Обработка...' : (showFeedback ? 'Далее' : 'Подтвердить решение')}
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Bottom Panel */}
      {timeline.length > 0 && (
        <div className="bg-white border-t border-gray-200 shadow-sm">
          <button
            onClick={() => setTimelineOpen(!timelineOpen)}
            className="w-full px-6 py-2 flex items-center justify-between text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock size={14} />
              Хронология ({timeline.length})
            </span>
            {timelineOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {timelineOpen && (
            <div className="px-6 pb-3 max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {timeline.map((event, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                    <span className="text-gray-700">{event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}