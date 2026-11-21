"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ChevronRight, ChevronDown, Trash2, Pencil } from "lucide-react";
import { useCodingStore, CODE_COLORS } from "@/stores/coding-store";
import type { Code } from "@/stores/coding-store";

// ---------------------------------------------------------------------------
// CodebookPanel — left panel of the 3-panel coding interface
// ---------------------------------------------------------------------------

export function CodebookPanel() {
  const codes = useCodingStore((s) => s.codes);
  const activeCodeId = useCodingStore((s) => s.activeCodeId);
  const selectedRange = useCodingStore((s) => s.selectedRange);
  const setActiveCode = useCodingStore((s) => s.setActiveCode);
  const addCode = useCodingStore((s) => s.addCode);
  const updateCode = useCodingStore((s) => s.updateCode);
  const removeCode = useCodingStore((s) => s.removeCode);
  const applyCodeToSelection = useCodingStore((s) => s.applyCodeToSelection);
  const getRootCodes = useCodingStore((s) => s.getRootCodes);
  const getChildCodes = useCodingStore((s) => s.getChildCodes);
  const getCodeFrequencies = useCodingStore((s) => s.getCodeFrequencies);

  const frequencies = getCodeFrequencies();
  const rootCodes = getRootCodes();

  // Track which root codes are expanded
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Track which code is being edited inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCodeClick = useCallback(
    (code: Code) => {
      if (selectedRange) {
        applyCodeToSelection(code.id);
      } else {
        setActiveCode(code.id);
      }
    },
    [selectedRange, applyCodeToSelection, setActiveCode],
  );

  const handleDelete = useCallback(
    (code: Code, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm(`Delete code "${code.name}" and all its segments?`)) {
        removeCode(code.id);
      }
    },
    [removeCode],
  );

  const startEditing = useCallback((code: Code) => {
    setEditingId(code.id);
    setEditValue(code.name);
  }, []);

  const commitEdit = useCallback(
    (id: string) => {
      const trimmed = editValue.trim();
      if (trimmed) {
        updateCode(id, { name: trimmed });
      }
      setEditingId(null);
    },
    [editValue, updateCode],
  );

  const handleAddChild = useCallback(
    (parentId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const usedColors = new Set(codes.map((c) => c.color));
      const nextColor =
        CODE_COLORS.find((c) => !usedColors.has(c)) ?? CODE_COLORS[0];
      addCode("New code", "", nextColor, parentId);
      setExpandedIds((prev) => new Set(prev).add(parentId));
    },
    [codes, addCode],
  );

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold tracking-wide uppercase">
          Codebook{" "}
          <span
            className="ml-1 text-xs font-normal"
            style={{ color: "var(--muted)" }}
          >
            ({codes.length})
          </span>
        </h2>
      </div>

      {/* Add Code Form */}
      <AddCodeForm />

      {/* Code List */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {rootCodes.length === 0 ? (
          <p
            className="px-3 py-6 text-center text-xs"
            style={{ color: "var(--muted)" }}
          >
            No codes yet. Add your first code above.
          </p>
        ) : (
          rootCodes.map((code) => {
            const children = getChildCodes(code.id);
            const isExpanded = expandedIds.has(code.id);
            const hasChildren = children.length > 0;

            return (
              <div key={code.id}>
                <CodeRow
                  code={code}
                  depth={0}
                  hasChildren={hasChildren}
                  isExpanded={isExpanded}
                  isActive={code.id === activeCodeId}
                  frequency={frequencies.get(code.id) ?? 0}
                  editingId={editingId}
                  editValue={editValue}
                  onToggle={() => toggleExpanded(code.id)}
                  onClick={() => handleCodeClick(code)}
                  onDoubleClick={() => startEditing(code)}
                  onDelete={(e) => handleDelete(code, e)}
                  onAddChild={(e) => handleAddChild(code.id, e)}
                  onEditChange={setEditValue}
                  onEditCommit={() => commitEdit(code.id)}
                  onEditCancel={() => setEditingId(null)}
                />
                {isExpanded &&
                  children.map((child) => (
                    <CodeRow
                      key={child.id}
                      code={child}
                      depth={1}
                      hasChildren={false}
                      isExpanded={false}
                      isActive={child.id === activeCodeId}
                      frequency={frequencies.get(child.id) ?? 0}
                      editingId={editingId}
                      editValue={editValue}
                      onClick={() => handleCodeClick(child)}
                      onDoubleClick={() => startEditing(child)}
                      onDelete={(e) => handleDelete(child, e)}
                      onEditChange={setEditValue}
                      onEditCommit={() => commitEdit(child.id)}
                      onEditCancel={() => setEditingId(null)}
                    />
                  ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddCodeForm — inline form at the top
// ---------------------------------------------------------------------------

function AddCodeForm() {
  const codes = useCodingStore((s) => s.codes);
  const addCode = useCodingStore((s) => s.addCode);

  const usedColors = new Set(codes.map((c) => c.color));
  const defaultColor =
    CODE_COLORS.find((c) => !usedColors.has(c)) ?? CODE_COLORS[0];

  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update default color when codes change
  useEffect(() => {
    const used = new Set(codes.map((c) => c.color));
    const next = CODE_COLORS.find((c) => !used.has(c)) ?? CODE_COLORS[0];
    setColor(next);
  }, [codes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addCode(trimmed, "", color);
    setName("");
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex shrink-0 flex-col gap-2 px-3 py-2"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New code..."
          className="min-w-0 flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-1"
          style={{
            borderColor: "var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40"
          style={{
            background: "var(--accent)",
            color: "var(--foreground)",
          }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Color picker row */}
      <div className="flex flex-wrap items-center gap-1">
        {CODE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className="flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110"
            style={{
              background: c,
              outline: c === color ? `2px solid ${c}` : "none",
              outlineOffset: "2px",
            }}
            aria-label={`Select color ${c}`}
          />
        ))}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// CodeRow — a single code entry
// ---------------------------------------------------------------------------

interface CodeRowProps {
  code: Code;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isActive: boolean;
  frequency: number;
  editingId: string | null;
  editValue: string;
  onToggle?: () => void;
  onClick: () => void;
  onDoubleClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onAddChild?: (e: React.MouseEvent) => void;
  onEditChange: (value: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
}

function CodeRow({
  code,
  depth,
  hasChildren,
  isExpanded,
  isActive,
  frequency,
  editingId,
  editValue,
  onToggle,
  onClick,
  onDoubleClick,
  onDelete,
  onAddChild,
  onEditChange,
  onEditCommit,
  onEditCancel,
}: CodeRowProps) {
  const isEditing = editingId === code.id;
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEditCommit();
    } else if (e.key === "Escape") {
      onEditCancel();
    }
  };

  const paddingLeft = depth === 0 ? 8 : 28;

  return (
    <div
      className="group relative flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors"
      style={{
        paddingLeft: `${paddingLeft}px`,
        background: isActive ? `${code.color}10` : "transparent",
        borderLeft: isActive ? `3px solid ${code.color}` : "3px solid transparent",
      }}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      {/* Chevron for root codes with children */}
      {depth === 0 && onToggle ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors"
          style={{ color: "var(--muted)" }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className="inline-block h-3 w-3" />
          )}
        </button>
      ) : null}

      {/* Color circle */}
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ background: code.color }}
      />

      {/* Name or edit input */}
      {isEditing ? (
        <input
          ref={editInputRef}
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onEditCommit}
          onKeyDown={handleEditKeyDown}
          className="min-w-0 flex-1 rounded border px-1 py-0 text-sm outline-none"
          style={{
            borderColor: "var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{code.name}</span>
      )}

      {/* Shortcut badge */}
      {code.shortcut != null && (
        <span
          className="shrink-0 rounded px-1 font-mono text-[10px]"
          style={{ background: "var(--accent)", color: "var(--foreground)" }}
        >
          {code.shortcut}
        </span>
      )}

      {/* Frequency badge */}
      {frequency > 0 && (
        <span
          className="shrink-0 rounded-full px-1.5 text-[10px] font-medium"
          style={{ background: "var(--accent)", color: "var(--foreground)" }}
        >
          {frequency}
        </span>
      )}

      {/* Hover actions */}
      <div className="invisible flex shrink-0 items-center gap-0.5 group-hover:visible">
        {onAddChild && depth === 0 && (
          <button
            onClick={onAddChild}
            className="rounded p-0.5 transition-colors hover:opacity-70"
            style={{ color: "var(--muted)" }}
            title="Add child code"
          >
            <Plus size={14} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDoubleClick();
          }}
          className="rounded p-0.5 transition-colors hover:opacity-70"
          style={{ color: "var(--muted)" }}
          title="Rename code"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-0.5 transition-colors hover:opacity-70"
          style={{ color: "#ef4444" }}
          title="Delete code"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
