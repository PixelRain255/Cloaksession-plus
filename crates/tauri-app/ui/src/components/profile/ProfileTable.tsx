import { CheckSquare, Minus, Square } from "lucide-react";
import type { JSX } from "react";
import { ProfileRow } from "./ProfileRow";
import type { TileData } from "./ProfileTile";

interface Props {
  profiles: TileData[];
  /** Profiles in the terminating phase (winding down, not yet exited). */
  closingIds?: Set<string>;
  selectedIds: Set<string>;
  selectedVisibleCount: number;
  onToggleAll: () => void;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onLaunch: (id: string) => Promise<void> | void;
  onStop: (id: string) => Promise<void> | void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Single source of truth for the table grid. Both header and rows use this
 * exact template so the dense workspace stays aligned at desktop widths.
 */
export const PROFILE_TABLE_GRID_TEMPLATE =
  "34px minmax(220px, 1.5fr) 110px minmax(140px, 1fr) 100px minmax(160px, 1fr) 120px";

const COLUMNS: ReadonlyArray<{ label: string; align?: "left" | "right" }> = [
  { label: "", align: "left" },
  { label: "Name" },
  { label: "Status" },
  { label: "Tags" },
  { label: "Last opened" },
  { label: "Proxy" },
  { label: "", align: "right" },
];

export function ProfileTable({
  profiles,
  closingIds,
  selectedIds,
  selectedVisibleCount,
  onToggleAll,
  onToggle,
  onSelect,
  onLaunch,
  onStop,
  onExport,
  onDelete,
}: Props): JSX.Element {
  return (
    <div className="roxy-table-shell">
      <div
        className="grid items-center gap-3 px-4 py-2 sticky top-0 z-10"
        style={{
          gridTemplateColumns: PROFILE_TABLE_GRID_TEMPLATE,
          background: "rgba(10,11,15,0.94)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {COLUMNS.map((c, i) => (
          <div
            key={c.label || `col-${i}`}
            className="text-[10px] font-semibold tracking-wider uppercase text-slate-600"
            style={{ textAlign: c.align ?? "left" }}
          >
            {i === 0 ? (
              <button
                type="button"
                className="roxy-checkbox"
                onClick={onToggleAll}
                aria-label={selectedVisibleCount === profiles.length ? "Clear all selected profiles" : "Select all visible profiles"}
                title={selectedVisibleCount === profiles.length ? "Clear all" : "Select all"}
              >
                {selectedVisibleCount === profiles.length ? <CheckSquare size={14} /> : selectedVisibleCount > 0 ? <Minus size={14} /> : <Square size={14} />}
              </button>
            ) : (
              c.label
            )}
          </div>
        ))}
      </div>

      {profiles.map((p) => (
        <ProfileRow
          key={p.id}
          profile={p}
          terminating={closingIds?.has(p.id) ?? false}
          selected={selectedIds.has(p.id)}
          onToggle={() => onToggle(p.id)}
          onOpen={() => onSelect(p.id)}
          onLaunch={() => onLaunch(p.id)}
          onStop={() => onStop(p.id)}
          onExport={() => onExport(p.id)}
          onDelete={() => onDelete(p.id)}
        />
      ))}
    </div>
  );
}
