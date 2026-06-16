import { useState, useRef, useEffect } from "react";
import { Trash2, ImageIcon, Loader2 } from "lucide-react";
import { useCanvas, type ScriptData } from "@/store/canvasStore";
import { useAssetUpload } from "@/lib/useAssetUpload";
import { filterShots } from "@/lib/scriptColumns";

interface Props {
  nodeId: string;
  script: ScriptData;
}

export function ScriptCardView({ nodeId, script }: Props) {
  const updateScriptShot = useCanvas((s) => s.updateScriptShot);
  const removeScriptShot = useCanvas((s) => s.removeScriptShot);
  const setScriptImage = useCanvas((s) => s.setScriptImage);
  const removeScriptImage = useCanvas((s) => s.removeScriptImage);

  const filtered = filterShots(script.shots, script.filter);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-[13px]" style={{ color: "#9CA3AF" }}>
        {script.shots.length === 0 ? "暂无镜头数据" : "无匹配结果"}
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
    >
      {filtered.map((shot) => (
        <div
          key={shot.id}
          className="group/card rounded-xl overflow-hidden"
          style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
        >
          {/* Image area with overlaid badges */}
          <div className="relative" style={{ background: "#F3F4F6" }}>
            <RefImageArea
              src={shot.refImage}
              onUpload={(src) => setScriptImage(nodeId, shot.id, { kind: "ref" }, src)}
              onRemove={() => removeScriptImage(nodeId, shot.id, { kind: "ref" })}
            />
            {/* Index badge — top left */}
            <span
              className="absolute flex items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{
                top: 10,
                left: 10,
                width: 28,
                height: 28,
                background: "rgba(0,0,0,0.55)",
              }}
            >
              {shot.index}
            </span>
            {/* Duration badge — top right */}
            <span
              className="absolute rounded-md text-[11px] font-medium text-white"
              style={{
                top: 10,
                right: 10,
                padding: "4px 8px",
                background: "rgba(0,0,0,0.55)",
              }}
            >
              {shot.duration}s
            </span>
            {/* Delete button — top right, below duration */}
            <button
              className="absolute opacity-0 group-hover/card:opacity-100 flex items-center justify-center rounded-full transition-opacity"
              style={{
                top: 10,
                right: 10,
                width: 28,
                height: 28,
                background: "rgba(0,0,0,0.45)",
              }}
              onClick={() => {
                if (confirm(`删除第 ${shot.index} 镜？`)) removeScriptShot(nodeId, shot.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* Card body */}
          <div style={{ padding: "10px 14px 12px" }}>
            {/* Characters */}
            {shot.characters.length > 0 && (
              <div className="text-[12px] truncate mb-1" style={{ color: "#374151" }}>
                {shot.characters.map((c) => c.name).join(", ")}
              </div>
            )}

            {/* Description */}
            <EditableField
              value={shot.description}
              onChange={(v) => updateScriptShot(nodeId, shot.id, { description: v })}
              className="text-[12px]"
              style={{ color: "#6B7280", lineHeight: 1.5 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RefImageArea({
  src,
  onUpload,
  onRemove,
}: {
  src?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploading, upload } = useAssetUpload();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result) onUpload(result.url);
    e.target.value = "";
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {uploading ? (
        <div
          className="w-full flex flex-col items-center justify-center"
          style={{ height: 180, background: "#F3F4F6" }}
        >
          <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: "#9CA3AF" }} />
          <span className="text-[12px]" style={{ color: "#9CA3AF" }}>
            上传中…
          </span>
        </div>
      ) : src ? (
        <div
          className="relative overflow-hidden cursor-pointer"
          style={{ height: 180, background: "#F3F4F6" }}
          onClick={() => fileRef.current?.click()}
          onContextMenu={(e) => {
            e.preventDefault();
            onRemove();
          }}
        >
          <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      ) : (
        <div
          className="w-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
          style={{ height: 180, background: "#F3F4F6" }}
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon className="w-10 h-10 mb-2" style={{ color: "#D1D5DB" }} />
          <span className="text-[12px]" style={{ color: "#D1D5DB" }}>
            暂无图片
          </span>
        </div>
      )}
    </>
  );
}

function EditableField({
  value,
  onChange,
  className,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      ref.current?.focus();
    }
  }, [editing, value]);

  if (editing) {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded outline-none resize-none ${className ?? ""}`}
        style={{
          ...style,
          background: "#FFFFFF",
          border: "1px solid #3B82F6",
          padding: "4px 6px",
          minHeight: 48,
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
    );
  }

  return (
    <div
      className={`cursor-text ${className ?? ""}`}
      style={style}
      onDoubleClick={() => setEditing(true)}
    >
      {value || <span style={{ color: "#D1D5DB" }}>双击编辑…</span>}
    </div>
  );
}
