export interface EventSchemaData {
  topic: string;
  key?: string;
  partitions?: number;
  retention?: string;
  schema?: Record<string, string>;
}

interface Props {
  data: EventSchemaData;
}

export function EventSchemaArtifact({ data }: Props) {
  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-800 text-white">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Kafka Topic</p>
        <h2 className="text-base font-mono font-bold">{data.topic}</h2>
      </div>
      <div className="px-6 py-3 flex gap-6 border-b border-gray-100 text-sm text-gray-600">
        {data.key && (
          <span><span className="font-semibold text-gray-800">Key:</span> {data.key}</span>
        )}
        {data.partitions && (
          <span><span className="font-semibold text-gray-800">Partitions:</span> {data.partitions}</span>
        )}
        {data.retention && (
          <span><span className="font-semibold text-gray-800">Retention:</span> {data.retention}</span>
        )}
      </div>
      {data.schema && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-2 text-left font-semibold text-gray-600 border-b border-gray-100">Поле</th>
                <th className="px-6 py-2 text-left font-semibold text-gray-600 border-b border-gray-100">Тип</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.schema).map(([field, type]) => (
                <tr key={field} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-2 font-mono text-blue-700">{field}</td>
                  <td className="px-6 py-2 text-gray-600">{type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
