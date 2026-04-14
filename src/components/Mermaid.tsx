import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
  onRender?: () => void;
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
});

export const Mermaid: React.FC<MermaidProps> = ({ chart, onRender }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      mermaid.contentLoaded();
      const id = `mermaid-${Math.random().toString(36).substring(7)}`;
      mermaid.render(id, chart).then((result) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = result.svg;
          onRender?.();
        }
      });
    }
  }, [chart]);

  return <div ref={containerRef} className="flex justify-center w-full overflow-auto p-4" />;
};
