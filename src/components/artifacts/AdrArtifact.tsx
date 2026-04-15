export interface AdrData {
  title: string;
  status: string;
  date?: string;
  context?: string;
  decision?: string;
  consequences?: string[];
}

interface Props {
  data: AdrData;
}

export function AdrArtifact({ data }: Props) {
  const statusColor =
    data.status === 'Accepted' ? 'bg-green-100 text-green-800 border-green-300' :
    data.status === 'Deprecated' ? 'bg-red-100 text-red-800 border-red-300' :
    'bg-yellow-100 text-yellow-800 border-yellow-300';

  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-gray-900">{data.title}</h2>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border whitespace-nowrap ${statusColor}`}>
          {data.status}
        </span>
      </div>
      {data.date && (
        <p className="px-6 py-2 text-xs text-gray-400 border-b border-gray-100">Дата: {data.date}</p>
      )}
      <div className="px-6 py-4 space-y-4">
        {data.context && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Контекст</p>
            <p className="text-sm text-gray-700 leading-relaxed">{data.context}</p>
          </div>
        )}
        {data.decision && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Решение</p>
            <p className="text-sm text-gray-700 leading-relaxed">{data.decision}</p>
          </div>
        )}
        {data.consequences && data.consequences.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Последствия</p>
            <ul className="space-y-1">
              {data.consequences.map((c, i) => {
                const isPlus = c.startsWith('Плюс');
                const isMinus = c.startsWith('Минус');
                return (
                  <li
                    key={i}
                    className={`text-sm flex items-start gap-2 ${isPlus ? 'text-green-700' : isMinus ? 'text-red-700' : 'text-gray-700'}`}
                  >
                    <span className="mt-0.5 font-bold flex-shrink-0">{isPlus ? '+' : isMinus ? '−' : '·'}</span>
                    <span>{c.replace(/^(Плюс|Минус):\s*/, '')}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
