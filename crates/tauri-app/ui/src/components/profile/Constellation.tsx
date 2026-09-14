import { useEffect, useMemo, useState, type JSX } from "react";
import { CheckSquare, Grid3x3, List, Play, Search, Square, X } from "lucide-react";
import type { ProfileSummary, ActivityEvent } from "../../types";
import { Kbd } from "../atoms";
import { ProfileTile, deriveTileState, type TileData, type TileState } from "./ProfileTile";
import { ProfileTable } from "./ProfileTable";
import { usePersistedState } from "../../lib/persisted";
import { cn } from "../../lib/cn";

type ViewMode = "grid" | "list";

interface FilterChip {
  id: "all" | TileState;
  label: string;
  kind?: TileState;
}

const FILTERS: FilterChip[] = [
  { id: "all", label: "All" },
  { id: "running", label: "Running", kind: "running" },
  { id: "ai", label: "AI-driven", kind: "ai" },
  { id: "error", label: "Errors", kind: "error" },
  { id: "idle", label: "Idle", kind: "idle" },
];

const DOT_COLOR: Record<TileState, string> = {
  running: "#34d399",
  ai: "#c084fc",
  error: "#f87171",
  idle: "#94a3b8",
};

interface Props {
  profiles: ProfileSummary[];
  recentEvents: ActivityEvent[];
  /** Profiles in the terminating phase (winding down, not yet exited). */
  closingIds?: Set<string>;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onLaunch: (id: string) => void;
  onStop: (id: string) => void;
  onBulkLaunch: (ids: string[]) => Promise<void>;
  onBulkStop: (ids: string[]) => Promise<void>;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
}

export function Constellation({
  profiles,
  recentEvents,
  closingIds,
  onSelect,
  onCreate,
  onLaunch,
  onStop,
  onBulkLaunch,
  onBulkStop,
  onExport,
  onDelete,
}: Props): JSX.Element {
  const [filter, setFilter] = useState<FilterChip["id"]>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = usePersistedState<ViewMode>("profilesView", "list");
  const [batchPending, setBatchPending] = useState(false);

  const tileData: TileData[] = useMemo(
    () =>
      profiles.map((p) => ({
        ...p,
        ...deriveTileState(p, recentEvents),
      })),
    [profiles, recentEvents],
  );

  const counts = useMemo(() => {
    const c: Record<FilterChip["id"], number> = { all: tileData.length, running: 0, ai: 0, error: 0, idle: 0 };
    for (const t of tileData) c[t.state] += 1;
    return c;
  }, [tileData]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) for (const t of p.tags) set.add(t);
    return Array.from(set).slice(0, 12);
  }, [profiles]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tileData.filter((t) => {
      if (filter !== "all" && t.state !== filter) return false;
      if (activeTag && !t.tags.includes(activeTag)) return false;
      if (
        normalizedQuery &&
        ![t.name, t.id, ...t.tags].some((value) => value.toLowerCase().includes(normalizedQuery))
      ) {
        return false;
      }
      return true;
    });
  }, [tileData, filter, activeTag, query]);

  const visibleIds = filtered.map((profile) => profile.id);
  const selectedVisibleIds = visibleIds.filter((id) => selectedIds.has(id));
  useEffect(() => {
    setSelectedIds((previous) => {
      const visible = new Set(visibleIds);
      const next = new Set(Array.from(previous).filter((id) => visible.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [visibleIds.join("|")]);
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;
  const aiCount = counts.ai;

  const selectedLaunchIds = selectedVisibleIds.filter((id) => tileData.find((profile) => profile.id === id)?.state === "idle");
  const selectedStopIds = selectedVisibleIds.filter((id) => tileData.find((profile) => profile.id === id)?.state !== "idle");

  function changeViewMode(next: ViewMode): void {
    setViewMode(next);
    if (next === "grid") setSelectedIds(new Set());
  }

  function toggleSelected(id: string): void {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible(): void {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function launchSelected(): Promise<void> {
    if (batchPending || selectedLaunchIds.length === 0) return;
    setBatchPending(true);
    try {
      await onBulkLaunch(selectedLaunchIds);
      setSelectedIds(new Set());
    } finally {
      setBatchPending(false);
    }
  }

  async function stopSelected(): Promise<void> {
    if (batchPending || selectedStopIds.length === 0) return;
    setBatchPending(true);
    try {
      await onBulkStop(selectedStopIds);
      setSelectedIds(new Set());
    } finally {
      setBatchPending(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 roxy-workspace">
      <div className="roxy-page-header">
        <div>
          <div className="roxy-eyebrow">Workspace / Browser profiles</div>
          <div className="flex items-baseline gap-3">
            <div className="text-lg font-bold tracking-tight text-slate-100">All profiles</div>
            <div className="mono text-[11px] text-slate-600">
              {profiles.length} total · {counts.running + counts.ai} running
              {aiCount > 0 && ` · ${aiCount} driven by Claude`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="roxy-view-switch" aria-label="Profile view">
            <button
              type="button"
              onClick={() => changeViewMode("list")}
              className={cn("roxy-icon-button", viewMode === "list" && "is-active")}
              title="List view"
              aria-label="List view"
            >
              <List size={14} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => changeViewMode("grid")}
              className={cn("roxy-icon-button", viewMode === "grid" && "is-active")}
              title="Grid view"
              aria-label="Grid view"
            >
              <Grid3x3 size={14} strokeWidth={1.8} />
            </button>
          </div>
          <button type="button" onClick={onCreate} className="btn-brand roxy-primary-action rounded-[7px] text-[12px] px-3 py-[7px]">
            <span className="text-base leading-none">+</span>
            New profile
            <Kbd variant="on-brand">⌘ N</Kbd>
          </button>
        </div>
      </div>

      <div className="roxy-filterbar">
        <label className="roxy-search-field">
          <Search size={14} strokeWidth={1.8} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search profiles, tags, or IDs"
            aria-label="Search profiles"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear search">
              <X size={13} />
            </button>
          )}
        </label>
        <div className="roxy-filter-divider" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((c) => {
            const isActive = filter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={cn("roxy-filter-chip", isActive && "is-active")}
                aria-pressed={isActive}
              >
                {c.kind && <span className="roxy-status-dot" style={{ background: DOT_COLOR[c.kind] }} />}
                {c.label}
                <span className="mono text-[10px] opacity-60">{counts[c.id]}</span>
              </button>
            );
          })}
        </div>
        {allTags.length > 0 && (
          <>
            <div className="roxy-filter-divider" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn("roxy-tag-chip", activeTag === tag && "is-active")}
                >
                  {tag}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedVisibleIds.length > 0 && (
        <div className="roxy-selectionbar">
          <div className="flex items-center gap-2 text-[12px] text-slate-300">
            <CheckSquare size={14} className="text-teal-300" />
            <span>{selectedVisibleIds.length} selected</span>
            <button type="button" className="roxy-link-button" onClick={() => setSelectedIds(new Set())}>Clear</button>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" className="roxy-batch-button" onClick={() => void launchSelected()} disabled={batchPending || selectedLaunchIds.length === 0} title="Launch selected">
              <Play size={12} fill="currentColor" /> Launch selected
            </button>
            <button type="button" className="roxy-batch-button" onClick={() => void stopSelected()} disabled={batchPending || selectedStopIds.length === 0} title="Stop selected">
              <Square size={11} fill="currentColor" /> Stop selected
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 pb-6 pt-3">
        {filtered.length === 0 ? (
          <div className="roxy-empty-state">
            <div className="text-sm text-slate-300">No profiles match the current view.</div>
            <div className="text-[12px] text-slate-600 mt-1">Adjust the search or filters, or create a new browser profile.</div>
          </div>
        ) : viewMode === "list" ? (
          <ProfileTable
            profiles={filtered}
            closingIds={closingIds}
            selectedIds={selectedIds}
            selectedVisibleCount={selectedVisibleIds.length}
            onToggleAll={toggleAllVisible}
            onToggle={toggleSelected}
            onSelect={onSelect}
            onLaunch={onLaunch}
            onStop={onStop}
            onExport={onExport}
            onDelete={onDelete}
          />
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtered.map((p) => (
              <ProfileTile
                key={p.id}
                profile={p}
                terminating={closingIds?.has(p.id) ?? false}
                onOpen={() => onSelect(p.id)}
                onLaunch={() => onLaunch(p.id)}
                onStop={() => onStop(p.id)}
                onExport={() => onExport(p.id)}
                onDelete={() => onDelete(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
