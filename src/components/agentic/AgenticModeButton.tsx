import React from "react";

export const AgenticModeButton: React.FC = () => {
  return (
    <button
      disabled
      className="px-4 py-2 bg-muted text-muted-foreground border-none rounded-lg cursor-not-allowed text-sm font-medium flex items-center gap-2 opacity-50"
      title="Agentic Mode - Coming Soon"
    >
      🤖 Agentic Mode (Coming Soon)
    </button>
  );
};
