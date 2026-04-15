import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useScenarioStore, Choice } from "../store/useScenarioStore";
import { Mermaid } from "../components/Mermaid";
import { AdrArtifact } from "../components/artifacts/AdrArtifact";
import { EventSchemaArtifact } from "../components/artifacts/EventSchemaArtifact";
import { InterfaceStructureArtifact } from "../components/artifacts/InterfaceStructureArtifact";
import { JourneyMapArtifact } from "../components/artifacts/JourneyMapArtifact";
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
  const [dragPlacements, setDragPlacements] = useState<Record<string, string>>({});
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [stepNumber, setStepNumber] = useState(1);
  const [phase, setPhase] = useState<'loading' | 'playing' | 'finished'>('loading');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const artifactViewerRef = useRef<HTMLDivElement>(null);
  const selectedSvgNodeRef = useRef<HTMLElement | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);
  const diagramClickRef = useRef<((el: Element) => void) | null>(null);

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
    setDragPlacements({});
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

  // Keep diagramClickRef current so onclick handlers attached in onRender never go stale
  useEffect(() => {
    if (currentNode?.node_type !== 'diagram_analysis') {
      diagramClickRef.current = null;
      return;
    }
    diagramClickRef.current = (el: Element) => {
      if (showFeedback) return;
      const nodeId = (el as SVGElement).id;
      const mermaidNodeId = nodeId.replace(/^.*-flowchart-/, '').replace(/-\d+$/, '');
      const matched = currentNode.choices.find(c => c.element_selector && mermaidNodeId === c.element_selector);
      if (matched) {
        setSelectedChoices([matched.id]);
        if (selectedSvgNodeRef.current) selectedSvgNodeRef.current.style.outline = '';
        selectedSvgNodeRef.current = el as HTMLElement;
        (el as HTMLElement).style.outline = '3px solid #3b82f6';
        (el as HTMLElement).style.borderRadius = '4px';
      }
    };
  }, [currentNode, showFeedback]);

  // Color the selected SVG node green/red when feedback is revealed
  useEffect(() => {
    if (!showFeedback || currentNode?.node_type !== 'diagram_analysis') return;
    if (!selectedSvgNodeRef.current || selectedChoices.length === 0) return;

    const selectedChoice = currentNode.choices.find(c => c.id === selectedChoices[0]);
    const isCorrect = selectedChoice?.correct ?? false;

    selectedSvgNodeRef.current.style.outline = `3px solid ${isCorrect ? '#22c55e' : '#ef4444'}`;

    // If wrong, also highlight the correct element in green
    if (!isCorrect) {
      const correctChoice = currentNode.choices.find(c => c.correct);
      if (correctChoice?.element_selector) {
        artifactViewerRef.current?.querySelectorAll<HTMLElement>('.node').forEach(node => {
          const nid = node.id.replace(/^.*-flowchart-/, '').replace(/-\d+$/, '');
          if (nid === correctChoice.element_selector!) {
            node.style.outline = '3px solid #22c55e';
            node.style.borderRadius = '4px';
          }
        });
      }
    }
  }, [showFeedback, currentNode, selectedChoices]);

  // Initialize ordering when node changes
  useEffect(() => {
    // Clear SVG selection state from previous diagram_analysis node
    if (selectedSvgNodeRef.current) {
      selectedSvgNodeRef.current.style.outline = '';
      selectedSvgNodeRef.current = null;
    }
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (currentNode?.node_type === 'ordering' && currentNode.choices) {
      const shuffled = [...currentNode.choices].sort(() => Math.random() - 0.5);
      setOrderedChoices(shuffled);
    }
    setDragPlacements({});
    // Auto-expand timeline when consequence node appears
    if (currentNode?.is_consequence) {
      setTimelineOpen(true);
    }
  }, [currentNode?.node_id]);

  // Detect scenario end: only when we're playing and advanceNode returned null
  useEffect(() => {
    if (phase === 'playing' && !currentNode && !loading) {
      invoke('save_results').catch(e => console.error('Failed to save results:', e));
      setPhase('finished');
      navigate(`/result/${id}`, { replace: true });
    }
  }, [currentNode, loading, phase]);

  if (phase === 'loading') return <div className="p-8">Загрузка сценария...</div>;
  if (phase === 'finished') return null;
  if (error) return <div className="p-8 text-red-500">Ошибка: {error}</div>;
  if (!currentNode) return <div className="p-8">Загрузка сценария...</div>;

  const isOrdering = currentNode?.node_type === 'ordering';
  const isDiagramAnalysis = currentNode?.node_type === 'diagram_analysis';
  const isDragClassification = currentNode?.node_type === 'drag_classification';
  const isArtifactReview = currentNode?.node_type === 'artifact_review';

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
      setDragPlacements({});
      setStepNumber(prev => prev + 1);
      await advanceNode();
    } else if (isDragClassification) {
      const allChoices = currentNode?.choices || [];
      const items = allChoices.map(c => {
        const placedCategory = dragPlacements[c.id];
        const isCorrect = placedCategory === c.correct_category;
        
        let targetCategoryName = currentNode?.context_artifact?.data.categories.find((cat: any) => cat.id === c.correct_category)?.label || c.correct_category;
        
        return {
          text: c.text,
          correct: isCorrect,
          feedback: isCorrect ? `Верно (${targetCategoryName})` : c.feedback || `Неверно. Правильная категория: ${targetCategoryName}`
        };
      });

      const payload = allChoices.map(c => `${c.id}:${dragPlacements[c.id] || ''}`);
      await submitChoices(payload);
      await refreshTimeline();
      setFeedbackItems(items);
      setShowFeedback(true);
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

  const canSubmit = showFeedback ||
    (isOrdering && orderedChoices.length > 0) ||
    (isDragClassification && Object.keys(dragPlacements).length === (currentNode?.choices.length || 0)) ||
    (isDiagramAnalysis && selectedChoices.length > 0) ||
    (isArtifactReview && selectedChoices.length > 0) ||
    (selectedChoices.length > 0);

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
          {currentNode?.context_artifact &&
           (currentNode.context_artifact.type === 'diagram' || currentNode.context_artifact.type === 'table') && (
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
            className={`flex-1 overflow-hidden p-6 flex flex-col items-center justify-center relative ${currentNode?.context_artifact?.type === 'diagram' && currentNode?.node_type !== 'diagram_analysis' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            onMouseDown={(e) => {
              if (e.button !== 0 || currentNode?.context_artifact?.type !== 'diagram') return;
              if (currentNode?.node_type === 'diagram_analysis') return; // clicks are for node selection, not panning
              setIsDragging(true);
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onDragOver={(e) => {
              if (currentNode?.context_artifact?.type === 'classification') {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDragEnter={(e) => {
              if (currentNode?.context_artifact?.type === 'classification') {
                e.preventDefault();
              }
            }}
          >
            {!currentNode?.context_artifact && (
              <div className="text-gray-400 text-sm flex flex-col items-center gap-2 m-auto">
                <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                Нет активного артефакта
              </div>
            )}

            {/* Zoomable artifacts — inside transform wrapper */}
            {currentNode?.context_artifact &&
             (currentNode.context_artifact.type === 'diagram' || currentNode.context_artifact.type === 'table') && (
              <div
                className="origin-center flex justify-center w-full select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-in-out'
                }}
              >
                {currentNode.context_artifact.type === 'diagram' && (
                  <Mermaid
                    chart={currentNode.context_artifact.data as string}
                    onRender={() => {
                      if (currentNode?.node_type === 'diagram_analysis') {
                        artifactViewerRef.current?.querySelectorAll<SVGGElement>('.node').forEach(node => {
                          node.style.cursor = 'pointer';
                          node.style.pointerEvents = 'all';
                          node.onclick = (e) => {
                            e.stopPropagation();
                            diagramClickRef.current?.(node);
                          };
                        });
                      }
                    }}
                  />
                )}

                {currentNode.context_artifact.type === 'table' && currentNode.context_artifact.data && (
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

            {/* ADR Renderer */}
            {currentNode?.context_artifact?.type === 'adr' && currentNode.context_artifact.data && (
              <AdrArtifact data={currentNode.context_artifact.data} />
            )}

            {/* Event Schema Renderer */}
            {currentNode?.context_artifact?.type === 'event_schema' && currentNode.context_artifact.data && (
              <EventSchemaArtifact data={currentNode.context_artifact.data} />
            )}

            {/* Interface Structure Renderer */}
            {currentNode?.context_artifact?.type === 'interface_structure' && currentNode.context_artifact.data && (
              <InterfaceStructureArtifact data={currentNode.context_artifact.data} />
            )}

            {/* Customer Journey Map Renderer */}
            {currentNode?.context_artifact?.type === 'journey_map' && currentNode.context_artifact.data && (
              <JourneyMapArtifact data={currentNode.context_artifact.data} />
            )}

            {currentNode?.context_artifact &&
             (currentNode.context_artifact.type === 'classification' || currentNode.context_artifact.type === 'reviewable_table') && (
              <div className="w-full h-full p-2 flex flex-col items-center justify-center">
                {currentNode.context_artifact.type === 'classification' && currentNode.context_artifact.data && (
                  <div className="w-full grid grid-cols-2 gap-4">
                    {(currentNode.context_artifact.data.categories || []).map((cat: any) => (
                      <div
                        key={cat.id}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 min-h-[150px] flex flex-col"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).classList.add('bg-blue-50', 'border-blue-300');
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            (e.currentTarget as HTMLElement).classList.remove('bg-blue-50', 'border-blue-300');
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).classList.remove('bg-blue-50', 'border-blue-300');
                          const itemId = draggedItemIdRef.current;
                          if (itemId && !showFeedback) {
                            setDragPlacements(prev => ({ ...prev, [itemId]: cat.id }));
                          }
                          draggedItemIdRef.current = null;
                        }}
                      >
                        <h4 className="font-bold text-gray-700 mb-3 text-center">{cat.label}</h4>
                        <div className="flex-1 flex flex-col gap-2">
                          {currentNode.choices.filter(c => dragPlacements[c.id] === cat.id).map(choice => (
                            <div
                              key={choice.id}
                              draggable={!showFeedback}
                              onDragStart={(e) => {
                                if (!showFeedback) {
                                  draggedItemIdRef.current = choice.id;
                                  e.dataTransfer.effectAllowed = 'move';
                                  e.dataTransfer.setData('text', choice.id);
                                  (e.target as HTMLElement).style.opacity = '0.5';
                                }
                              }}
                              onDragEnd={(e) => {
                                (e.target as HTMLElement).style.opacity = '1';
                                draggedItemIdRef.current = null;
                              }}
                              className="bg-white border border-gray-200 shadow-sm p-2 rounded text-sm text-gray-800 text-center cursor-grab hover:bg-gray-50 active:cursor-grabbing"
                            >
                              {choice.text}
                            </div>
                          ))}
                          {Object.values(dragPlacements).every(v => v !== cat.id) && (
                            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                              Перетащите сюда...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentNode.context_artifact.type === 'reviewable_table' && currentNode.context_artifact.data && (
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
                        {(currentNode.context_artifact.data.rows || []).map((row: any) => (
                          <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                            {(row.cells || []).map((cell: any) => {
                              const isSelected = selectedChoices.includes(cell.id);

                              let feedbackClass = '';
                              if (showFeedback) {
                                const isError = currentNode.choices.some(c => c.id === cell.id);
                                if (isSelected && isError) feedbackClass = 'bg-green-100 border-green-500 ring-2 ring-green-400';
                                else if (isSelected && !isError) feedbackClass = 'bg-red-100 border-red-500 ring-2 ring-red-400';
                                else if (!isSelected && isError) feedbackClass = 'bg-orange-100 border-orange-400 ring-2 ring-orange-300';
                              } else if (isSelected) {
                                feedbackClass = 'bg-red-50 border-red-300 ring-2 ring-red-200';
                              } else {
                                feedbackClass = 'hover:bg-yellow-50';
                              }

                              return (
                                <td
                                  key={cell.id}
                                  onClick={() => {
                                    if (!showFeedback) handleChoiceToggle(cell.id);
                                  }}
                                  className={`cursor-pointer px-4 py-2 border border-gray-200 transition-colors ${feedbackClass}`}
                                >
                                  {cell.value}
                                </td>
                              );
                            })}
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
            {isOrdering ? 'Расположите в правильном порядке' : 
             isDragClassification ? 'Перетащите элементы' :
             isDiagramAnalysis ? 'Анализ диаграммы' :
             isArtifactReview ? 'Поиск ошибок' :
             'Решение'}
          </h3>
          {!showFeedback && (
            <p className="text-xs text-gray-400 mb-4">
              {isOrdering ? 'Упорядочьте элементы' :
               isDragClassification ? 'Перетащите элементы слева в правильные категории справа' :
               isDiagramAnalysis ? 'Кликните на проблемный элемент на диаграмме' :
               isArtifactReview ? 'Найдите ошибки в артефакте (выделите ячейки) и нажмите подтвердить' :
               currentNode?.node_type === 'single_choice' ? 'Выберите один вариант' : 'Выберите один или несколько вариантов'}
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
          ) : isDragClassification && !showFeedback ? (
            /* Drag Classification UI */
            <div 
              className="space-y-2 flex-1 pb-4"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDragEnter={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const itemId = draggedItemIdRef.current;
                if (itemId && !showFeedback) {
                  setDragPlacements(prev => {
                    const next = { ...prev };
                    delete next[itemId];
                    return next;
                  });
                }
                draggedItemIdRef.current = null;
              }}
            >
              <p className="text-xs text-gray-400 italic mb-2 text-center">Нераспределенные элементы:</p>
              {currentNode?.choices.filter(c => !dragPlacements[c.id]).map(choice => (
                <div 
                  key={choice.id} 
                  draggable={true}
                  onDragStart={(e) => {
                    if (!showFeedback) {
                      draggedItemIdRef.current = choice.id;
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text', choice.id);
                      (e.target as HTMLElement).style.opacity = '0.5';
                    }
                  }}
                  onDragEnd={(e) => {
                    (e.target as HTMLElement).style.opacity = '1';
                    draggedItemIdRef.current = null;
                  }}
                  className="p-3 border border-gray-200 rounded-lg cursor-grab hover:bg-gray-50 transition-colors shadow-sm bg-white active:cursor-grabbing"
                >
                  <p className="text-sm font-medium text-gray-800">{choice.text}</p>
                </div>
              ))}
              {currentNode?.choices.filter(c => !dragPlacements[c.id]).length === 0 && (
                <div className="text-center p-4 text-green-600 font-medium bg-green-50 rounded-lg border border-green-200">
                  Все элементы распределены!
                </div>
              )}
            </div>
          ) : isDiagramAnalysis && !showFeedback ? (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50 text-center">
              {selectedChoices.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Выбран элемент:</p>
                  <p className="text-sm font-medium text-blue-700">
                    {currentNode.choices.find(c => c.id === selectedChoices[0])?.text}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Кликните другой элемент, чтобы изменить</p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Кликните на проблемный элемент диаграммы.</p>
              )}
            </div>
          ) : isArtifactReview && !showFeedback ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50 text-gray-500 text-center">
              <p className="mb-2">Выберите ошибочные ячейки в артефакте.</p>
              <p className="text-sm">Выбрано: <strong>{selectedChoices.length}</strong></p>
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