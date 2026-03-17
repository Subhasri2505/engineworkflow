"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Step, Rule } from "@/types";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "Inter, sans-serif",
});

interface WorkflowMapProps {
  steps: Step[];
  workflowId: string;
}

export function WorkflowMap({ steps, workflowId }: WorkflowMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const renderChart = async () => {
      if (!steps || steps.length === 0) {
        setSvg("");
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Build Mermaid string
      let definition = "graph TD\n";
      
      // Styling
      definition += "classDef task fill:#1e293b,stroke:#334155,color:#fff\n";
      definition += "classDef approval fill:#1e1b4b,stroke:#3730a3,color:#fff\n";
      definition += "classDef notification fill:#064e3b,stroke:#065f46,color:#fff\n";
      definition += "classDef start fill:#1e3a8a,stroke:#3b82f6,color:#fff,stroke-width:2px\n";

      // Steps
      steps.forEach((step) => {
        const shape = step.step_type === "approval" ? `{"${step.name}"}` : `("${step.name}")`;
        definition += `  ${step.id.replace(/-/g, "_")}${shape}\n`;
        definition += `  class ${step.id.replace(/-/g, "_")} ${step.step_type}\n`;
      });

      // Rules (Edges)
      steps.forEach((step) => {
        if (step.rules && step.rules.length > 0) {
          step.rules.forEach((rule) => {
            if (rule.next_step_id) {
              const fromId = step.id.replace(/-/g, "_");
              const toId = rule.next_step_id.replace(/-/g, "_");
              const label = rule.condition.length > 20 
                ? `${rule.condition.substring(0, 20)}...` 
                : rule.condition;
              
              definition += `  ${fromId} -- "${label}" --> ${toId}\n`;
            }
          });
        }
      });

      try {
        const { svg } = await mermaid.render(`mermaid-${workflowId.replace(/-/g, "_")}`, definition);
        setSvg(svg);
      } catch (err) {
        console.error("Mermaid render error:", err);
      } finally {
        setLoading(false);
      }
    };

    renderChart();
  }, [steps, workflowId]);

  return (
    <Card className="w-full bg-gray-900 border-gray-800 p-6 overflow-auto min-h-[400px] flex items-center justify-center relative">
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-indigo-500" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Live Logic Map</span>
      </div>
      
      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      ) : svg ? (
        <div 
          ref={containerRef} 
          className="mermaid-container w-full h-full flex justify-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="text-gray-500 text-sm italic">
          No steps defined yet. add steps to see the map.
        </div>
      )}

      <style jsx global>{`
        .mermaid-container svg {
          max-width: 100%;
          height: auto;
        }
        .mermaid-container .edgePath path {
          stroke: #4b5563 !important;
          stroke-width: 2px !important;
        }
        .mermaid-container .label {
          color: #9ca3af !important;
          font-size: 12px !important;
        }
      `}</style>
    </Card>
  );
}
