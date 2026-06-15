import { useState, useRef, useEffect } from "react";
import { Trash2, Loader2, MoreHorizontal } from "lucide-react";
import {
  useCanvas,
  type ScriptData,
  type ScriptShot,
  type ScriptColumnKey,
} from "@/store/canvasStore";
import {
  SCRIPT_COLUMNS,
  characterGroupCount,
  visibleColumns,
  filterShots,
} from "@/lib/scriptColumns";
import { parseDescription } from "@/lib/assetUtils";
import { FinalPromptModal } from "./FinalPromptModal";

interface Props {
  nodeId: string;
  script: ScriptData;
  visibleColumnOverride?: ScriptColumnKey[];
  showActionsColumn?: boolean;
  onAddShot?: () => void;
  renderDialogueCell?: (shot: ScriptShot) => React.ReactNode;
}

/** Column key → accessor on ScriptShot */
const TEXT_FIELDS: Record<string, keyof ScriptShot> = {
  duration: "duration",
  description: "description",
  shotType: "shotType",
  action: "action",
  emotion: "emotion",
  sceneTags: "sceneTags",
  lighting: "lighting",
  sound: "sound",
  dialogue: "dialogue",
  cameraMove: "cameraMove",
  imagePrompt: "imagePrompt",
  videoPrompt: "videoPrompt",
  finalPrompt: "finalPrompt",
};

export function ScriptTableView({ nodeId, script, visibleColumnOverride, showActionsColumn, renderDialogueCell }: Props) {
  const updateScriptShot = useCanvas((s) => s.updateScriptShot);
  const updateScriptCharacter = useCanvas((s) => s.updateScriptCharacter);
  const removeScriptShot = useCanvas((s) => s.removeScriptShot);
  const setScriptImage = useCanvas((s) => s.setScriptImage);
  const removeScriptImage = useCanvas((s) => s.removeScriptImage);

  const visible = visibleColumnOverride ?? visibleColumns(script.hiddenColumns);
  const filtered = filterShots(script.shots, script.filter);
  const charCount = characterGroupCount(script.shots);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid #E5E7EB" }}
    >
      <div className="overflow-x-auto">
        <table
          className="w-full text-[12px]"
          style={{ borderCollapse: "collapse", tableLayout: "auto" }}
        >
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              {/* Index — always visible */}
              <th
                className="text-left font-medium whitespace-nowrap align-bottom"
                style={{
                  padding: "10px 12px",
                  color: "#6B7280",
                  background: "#F9FAFB",
                  width: 44,
                }}
              >
                镜号
              </th>
              {visible.map((key) => {
                if (key === "characters") {
                  const headers: React.ReactNode[] = [];
                  for (let gi = 0; gi < Math.max(1, charCount); gi++) {
                    headers.push(
                      <th
                        key={`char-${gi}-name`}
                        className="text-left font-medium whitespace-nowrap align-bottom"
                        style={{
                          padding: "10px 12px",
                          color: "#6B7280",
                          borderLeft: gi > 0 ? "1px solid #E5E7EB" : undefined,
                        }}
                      >
                        角色{gi + 1}
                      </th>,
                      <th
                        key={`char-${gi}-desc`}
                        className="text-left font-medium whitespace-nowrap align-bottom"
                        style={{ padding: "10px 12px", color: "#6B7280" }}
                      >
                        角色描述{gi + 1}
                      </th>,
                      <th
                        key={`char-${gi}-img`}
                        className="text-left font-medium whitespace-nowrap align-bottom"
                        style={{ padding: "10px 12px", color: "#6B7280", width: 56 }}
                      >
                        角色图{gi + 1}
                      </th>,
                    );
                  }
                  return headers;
                }
                if (key === "refImage") {
                  return (
                    <th
                      key={key}
                      className="text-left font-medium whitespace-nowrap align-bottom"
                      style={{ padding: "10px 12px", color: "#6B7280", width: 56 }}
                    >
                      参考
                    </th>
                  );
                }
                const col = SCRIPT_COLUMNS.find((c) => c.key === key);
                return (
                  <th
                    key={key}
                    className="text-left font-medium whitespace-nowrap align-bottom"
                    style={{ padding: "10px 12px", color: "#6B7280" }}
                  >
                    {col?.label ?? key}
                  </th>
                );
              })}
              {showActionsColumn && (
                <th
                  className="text-left font-medium whitespace-nowrap align-bottom"
                  style={{ padding: "10px 12px", color: "#6B7280", width: 56 }}
                >
                  操作
                </th>
              )}
              {/* Delete column */}
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((shot) => (
              <tr
                key={shot.id}
                className="group/row"
                style={{ borderTop: "1px solid #F3F4F6" }}
              >
                {/* Index */}
                <td
                  className="font-mono text-[12px] align-top"
                  style={{
                    padding: "10px 12px",
                    color: "#9CA3AF",
                    background: "#FFFFFF",
                  }}
                >
                  {shot.index}
                </td>
                {visible.map((key) => {
                  if (key === "characters") {
                    const cells: React.ReactNode[] = [];
                    for (let gi = 0; gi < Math.max(1, charCount); gi++) {
                      const char = shot.characters[gi];
                      cells.push(
                        <WrapCell
                          key={`${shot.id}-char-${gi}-name`}
                          value={char?.name ?? ""}
                          onChange={(v) =>
                            char
                              ? updateScriptCharacter(nodeId, shot.id, char.id, { name: v })
                              : undefined
                          }
                          style={{ borderLeft: gi > 0 ? "1px solid #F3F4F6" : undefined }}
                        />,
                        <WrapCell
                          key={`${shot.id}-char-${gi}-desc`}
                          value={char?.desc ?? ""}
                          onChange={(v) =>
                            char
                              ? updateScriptCharacter(nodeId, shot.id, char.id, { desc: v })
                              : undefined
                          }
                        />,
                        <ImageCell
                          key={`${shot.id}-char-${gi}-img`}
                          src={char?.image}
                          onUpload={(src) =>
                            char
                              ? setScriptImage(
                                  nodeId,
                                  shot.id,
                                  { kind: "character", charId: char.id },
                                  src,
                                )
                              : undefined
                          }
                          onRemove={() =>
                            char
                              ? removeScriptImage(nodeId, shot.id, {
                                  kind: "character",
                                  charId: char.id,
                                })
                              : undefined
                          }
                        />,
                      );
                    }
                    return cells;
                  }
                  if (key === "refImage") {
                    return (
                      <ImageCell
                        key={`${shot.id}-ref`}
                        src={shot.refImage}
                        onUpload={(src) =>
                          setScriptImage(nodeId, shot.id, { kind: "ref" }, src)
                        }
                        onRemove={() =>
                          removeScriptImage(nodeId, shot.id, { kind: "ref" })
                        }
                      />
                    );
                  }
                  // Description cell with @mention rendering
                  if (key === "description") {
                    return (
                      <DescriptionCell
                        key={`${shot.id}-description`}
                        value={shot.description}
                        onChange={(v) => updateScriptShot(nodeId, shot.id, { description: v })}
                      />
                    );
                  }
                  // Dialogue cell with optional popover override
                  if (key === "dialogue" && renderDialogueCell) {
                    return (
                      <td
                        key={`${shot.id}-dialogue`}
                        className="align-top"
                        style={{ padding: "10px 12px" }}
                      >
                        {renderDialogueCell(shot)}
                      </td>
                    );
                  }
                  // Final prompt column — status-based rendering
                  if (key === "finalPrompt") {
                    return (
                      <FinalPromptCell
                        key={`${shot.id}-finalPrompt`}
                        shot={shot}
                        nodeId={nodeId}
                      />
                    );
                  }
                  const field = TEXT_FIELDS[key];
                  if (!field) return <td key={key} />;
                  return (
                    <WrapCell
                      key={`${shot.id}-${key}`}
                      value={String(shot[field] ?? "")}
                      onChange={(v) => {
                        if (field === "duration") {
                          const num = parseFloat(v);
                          if (!isNaN(num) && num > 0)
                            updateScriptShot(nodeId, shot.id, { duration: num });
                          return;
                        }
                        updateScriptShot(nodeId, shot.id, {
                          [field]: v,
                        } as Partial<ScriptShot>);
                      }}
                    />
                  );
                })}
                {showActionsColumn && (
                  <td className="align-top" style={{ padding: "8px 4px" }}>
                    <button
                      className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                      style={{ width: 28, height: 28 }}
                    >
                      <MoreHorizontal className="w-4 h-4" style={{ color: "#9CA3AF" }} />
                    </button>
                  </td>
                )}
                {/* Delete */}
                <td className="align-top" style={{ padding: "8px 4px" }}>
                  <button
                    className="opacity-0 group-hover/row:opacity-100 flex items-center justify-center rounded hover:bg-red-50 transition-opacity"
                    style={{ width: 24, height: 24 }}
                    onClick={() => {
                      if (confirm(`删除第 ${shot.index} 镜？`))
                        removeScriptShot(nodeId, shot.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-8 text-[13px]" style={{ color: "#9CA3AF" }}>
          {script.shots.length === 0
            ? "暂无镜头数据"
            : "无匹配结果，请调整筛选条件"}
        </div>
      )}
    </div>
  );
}

/* ── Wrapping text cell (no truncation) ────────────────────────────── */

function WrapCell({
  value,
  onChange,
  style: extraStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => {
        ref.current?.focus();
        ref.current?.select();
      });
    }
  }, [editing, value]);

  if (editing) {
    return (
      <td className="align-top" style={{ padding: "6px 8px", ...extraStyle }}>
        <textarea
          ref={ref}
          className="w-full rounded text-[12px] outline-none resize-none"
          style={{
            padding: "4px 6px",
            background: "#FFFFFF",
            border: "1px solid #3B82F6",
            color: "#1A1A1A",
            minWidth: 80,
            minHeight: 60,
          }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onChange(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
        />
      </td>
    );
  }

  return (
    <td
      className="cursor-text align-top"
      style={{
        padding: "10px 12px",
        color: "#374151",
        lineHeight: 1.6,
        whiteSpace: "normal",
        wordBreak: "break-all",
        ...extraStyle,
      }}
      onDoubleClick={() => setEditing(true)}
    >
      {value || <span style={{ color: "#D1D5DB" }}>—</span>}
    </td>
  );
}

/* ── Description cell with @mention highlights ────────────────────── */

function DescriptionCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => {
        ref.current?.focus();
        ref.current?.select();
      });
    }
  }, [editing, value]);

  if (editing) {
    return (
      <td className="align-top" style={{ padding: "6px 8px" }}>
        <textarea
          ref={ref}
          className="w-full rounded text-[12px] outline-none resize-none"
          style={{
            padding: "4px 6px",
            background: "#FFFFFF",
            border: "1px solid #3B82F6",
            color: "#1A1A1A",
            minWidth: 80,
            minHeight: 60,
          }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onChange(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
        />
      </td>
    );
  }

  const segments = parseDescription(value);

  return (
    <td
      className="cursor-text align-top"
      style={{
        padding: "10px 12px",
        color: "#374151",
        lineHeight: 1.6,
        whiteSpace: "normal",
        wordBreak: "break-all",
      }}
      onDoubleClick={() => setEditing(true)}
    >
      {segments.length > 0 ? (
        segments.map((seg, i) =>
          seg.type === "mention" ? (
            <span key={i} style={{ color: "#22D3EE" }}>@{seg.value}</span>
          ) : (
            <span key={i}>{seg.value}</span>
          ),
        )
      ) : (
        <span style={{ color: "#D1D5DB" }}>--</span>
      )}
    </td>
  );
}

/* ── Final prompt status cell ──────────────────────────────────────── */

function FinalPromptCell({ shot, nodeId }: { shot: ScriptShot; nodeId: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const status = shot.finalPromptStatus ?? "pending";

  if (status === "composing") {
    return (
      <td className="align-top" style={{ padding: "10px 12px" }}>
        <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#F59E0B" }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          合成中
        </div>
      </td>
    );
  }

  if (status === "done" && shot.finalPrompt) {
    return (
      <td className="align-top" style={{ padding: "10px 12px" }}>
        <button
          className="text-[12px] font-medium transition-colors hover:underline"
          style={{ color: "#3B82F6" }}
          onClick={() => setModalOpen(true)}
        >
          查看提示词
        </button>
        {modalOpen && (
          <FinalPromptModal shot={shot} nodeId={nodeId} onClose={() => setModalOpen(false)} />
        )}
      </td>
    );
  }

  return (
    <td className="align-top" style={{ padding: "10px 12px" }}>
      <span className="text-[12px]" style={{ color: "#D1D5DB" }}>待生成提示词</span>
    </td>
  );
}

/* ── Image cell ────────────────────────────────────────────────────── */

function ImageCell({
  src,
  onUpload,
  onRemove,
}: {
  src?: string;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cellRef = useRef<HTMLTableCellElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onUpload(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <td ref={cellRef} className="align-top relative" style={{ padding: "6px 8px" }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {src ? (
        <div
          className="relative rounded overflow-hidden cursor-pointer group/img"
          style={{ width: 40, height: 30 }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      ) : (
        <button
          className="rounded flex items-center justify-center text-[11px] font-medium transition-colors hover:bg-gray-50"
          style={{
            width: 40,
            height: 30,
            border: "1px dashed #D1D5DB",
            color: "#9CA3AF",
          }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          +
        </button>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          className="absolute z-50 rounded-lg overflow-hidden"
          style={{
            top: "100%",
            left: 0,
            marginTop: 4,
            minWidth: 120,
            background: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            border: "1px solid #E5E7EB",
          }}
        >
          <button
            className="w-full text-left text-[13px] hover:bg-gray-50 transition-colors"
            style={{ padding: "10px 16px", color: "#1A1A1A" }}
            onClick={() => {
              setMenuOpen(false);
              fileRef.current?.click();
            }}
          >
            本地上传
          </button>
          <button
            className="w-full text-left text-[13px] hover:bg-gray-50 transition-colors"
            style={{ padding: "10px 16px", color: "#1A1A1A", borderTop: "1px solid #F3F4F6" }}
            onClick={() => {
              setMenuOpen(false);
              // TODO: open history gallery
            }}
          >
            历史图库
          </button>
          {src && (
            <button
              className="w-full text-left text-[13px] hover:bg-red-50 transition-colors"
              style={{ padding: "10px 16px", color: "#EF4444", borderTop: "1px solid #F3F4F6" }}
              onClick={() => {
                setMenuOpen(false);
                onRemove();
              }}
            >
              删除图片
            </button>
          )}
        </div>
      )}
    </td>
  );
}
