export interface Stage {
  name: string;
  actions?: string;
  thoughts?: string;
  emotion: 'positive' | 'neutral' | 'negative';
  touchpoints?: string[];
  pain_points?: string[];
}

export interface JourneyMapData {
  title?: string;
  persona?: string;
  stages: Stage[];
}

interface Props {
  data: JourneyMapData;
}

function emotionColor(e: string): string {
  if (e === 'positive') return '#22c55e';
  if (e === 'negative') return '#ef4444';
  return '#9ca3af';
}

function emotionLabel(e: string): string {
  if (e === 'positive') return '😊';
  if (e === 'negative') return '😟';
  return '😐';
}

export function JourneyMapArtifact({ data }: Props) {
  const stages = data.stages ?? [];

  return (
    <div className="w-full overflow-x-auto py-2">
      {data.title && (
        <h2 className="text-sm font-bold text-gray-700 mb-1 text-center">{data.title}</h2>
      )}
      {data.persona && (
        <p className="text-xs text-gray-400 text-center mb-4">{data.persona}</p>
      )}

      {stages.length > 1 && (
        <div className="relative mx-4 mb-2 h-10">
          <svg width="100%" height="40" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points={stages
                .map((s, i) => {
                  const cx = ((i + 0.5) / stages.length) * 100;
                  const cy = s.emotion === 'positive' ? 6 : s.emotion === 'negative' ? 34 : 20;
                  return `${cx}%,${cy}`;
                })
                .join(' ')}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            {stages.map((s, i) => {
              const cx = ((i + 0.5) / stages.length) * 100;
              const cy = s.emotion === 'positive' ? 6 : s.emotion === 'negative' ? 34 : 20;
              return (
                <circle
                  key={i}
                  cx={`${cx}%`}
                  cy={cy}
                  r={5}
                  fill={emotionColor(s.emotion)}
                  aria-label={s.emotion}
                />
              );
            })}
          </svg>
        </div>
      )}

      <div className="flex gap-3 min-w-max px-4 pb-2">
        {stages.map((stage, i) => (
          <div
            key={i}
            className="w-44 flex-shrink-0 border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm"
          >
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">{stage.name}</span>
              <span title={stage.emotion}>{emotionLabel(stage.emotion)}</span>
            </div>
            <div className="px-3 py-2 space-y-2 text-xs">
              {stage.actions && (
                <div>
                  <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Действия</p>
                  <p className="text-gray-700 leading-snug">{stage.actions}</p>
                </div>
              )}
              {stage.thoughts && (
                <div>
                  <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Мысли</p>
                  <p className="text-gray-600 italic leading-snug">"{stage.thoughts}"</p>
                </div>
              )}
              {stage.touchpoints && stage.touchpoints.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {stage.touchpoints.map((tp, ti) => (
                    <span key={ti} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                      {tp}
                    </span>
                  ))}
                </div>
              )}
              {stage.pain_points && stage.pain_points.length > 0 && (
                <div className="border-t border-red-100 pt-1">
                  {stage.pain_points.map((pp, pi) => (
                    <p key={pi} className="text-red-600 text-[10px] leading-snug">⚠ {pp}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
