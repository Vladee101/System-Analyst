export interface Screen {
  id: string;
  label: string;
  type: 'page' | 'modal';
  children: string[];
}

export interface InterfaceStructureData {
  title?: string;
  screens: Screen[];
}

interface Props {
  data: InterfaceStructureData;
}

function ScreenNode({ screen, screenMap }: { screen: Screen; screenMap: Map<string, Screen> }) {
  const isModal = screen.type === 'modal';
  return (
    <div className="flex flex-col items-center">
      <div
        className={`px-3 py-2 rounded-lg text-xs font-medium text-center min-w-[90px] max-w-[110px] ${
          isModal
            ? 'border-2 border-dashed border-purple-400 bg-purple-50 text-purple-800'
            : 'border-2 border-solid border-blue-300 bg-blue-50 text-blue-800'
        }`}
      >
        {screen.label}
        {isModal && <span className="block text-purple-500 text-[10px]">modal</span>}
      </div>
      {screen.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex gap-4 items-start">
            {screen.children.map((childId) => {
              const child = screenMap.get(childId);
              if (!child) return null;
              return (
                <div key={childId} className="flex flex-col items-center">
                  <div className="w-px h-4 bg-gray-300" />
                  <ScreenNode screen={child} screenMap={screenMap} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function InterfaceStructureArtifact({ data }: Props) {
  const screens = data.screens ?? [];
  const screenMap = new Map(screens.map((s) => [s.id, s]));
  const childIds = new Set(screens.flatMap((s) => s.children));
  const roots = screens.filter((s) => !childIds.has(s.id));

  return (
    <div className="w-full overflow-auto p-4">
      {data.title && (
        <h2 className="text-sm font-bold text-gray-700 mb-4 text-center">{data.title}</h2>
      )}
      <div className="flex gap-8 justify-center items-start">
        {roots.map((root) => (
          <ScreenNode key={root.id} screen={root} screenMap={screenMap} />
        ))}
      </div>
    </div>
  );
}
