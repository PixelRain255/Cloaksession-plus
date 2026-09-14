import type { JSX } from "react";
import { Boxes, Command, Plug, Settings } from "lucide-react";
import { cn } from "../../lib/cn";

export type Section = "profiles" | "mcp" | "settings";

interface Item {
  id: Section;
  icon: typeof Boxes;
  label: string;
  description: string;
  kbd: string;
}

const ITEMS: Item[] = [
  { id: "profiles", icon: Boxes, label: "Profiles", description: "Browser workspaces", kbd: "1" },
  { id: "mcp", icon: Plug, label: "MCP control", description: "Agent connections", kbd: "2" },
  { id: "settings", icon: Settings, label: "Settings", description: "Runtime and data", kbd: "," },
];

interface Props {
  active: Section;
  onChange: (s: Section) => void;
  onCmdK: () => void;
}

export function LeftRail({ active, onChange, onCmdK }: Props): JSX.Element {
  return (
    <aside className="roxy-rail flex flex-col flex-shrink-0">
      <div className="roxy-rail-context">
        <span className="roxy-rail-mark">C</span>
        <div>
          <div className="text-[12px] font-semibold text-slate-100">Cloaksession</div>
          <div className="mono text-[9px] text-slate-600 uppercase tracking-widest">Browser ops</div>
        </div>
      </div>
      <div className="roxy-rail-label">Workspace</div>
      <nav className="flex flex-col gap-1" aria-label="Workspace navigation">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              type="button"
              title={`${it.label} · ⌘${it.kbd}`}
              onClick={() => onChange(it.id)}
              className={cn("roxy-nav-item", isActive && "is-active")}
              aria-current={isActive ? "page" : undefined}
              aria-label={it.label}
            >
              <Icon size={16} strokeWidth={1.7} />
              <span className="min-w-0 flex-1 text-left">
                <span className="roxy-nav-label block text-[12px] font-medium">{it.label}</span>
                <span className="roxy-nav-description block text-[10px] text-slate-600">{it.description}</span>
              </span>
              <span className="roxy-nav-key mono text-[10px]">{it.kbd}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex-1" />
      <button type="button" title="Command palette · ⌘K" aria-label="Command palette" onClick={onCmdK} className="roxy-command-button">
        <Command size={15} strokeWidth={1.7} />
        <span className="roxy-nav-label">Command palette</span>
        <span className="roxy-nav-key mono text-[10px]">⌘K</span>
      </button>
    </aside>
  );
}
