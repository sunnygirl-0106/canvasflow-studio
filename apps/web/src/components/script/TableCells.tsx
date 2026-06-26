import { useState, useRef, useEffect } from "react";
import { DemoImg } from "@/components/DemoImg";
import { Loader2 } from "lucide-react";
import type { ScriptShot } from "@canvasflow/shared";
import { parseDescription } from "@/lib/assetUtils";
import { useAssetUpload } from "@/lib/useAssetUpload";
import { FinalPromptModal } from "./FinalPromptModal";

/* ── Wrapping text cell (no truncation) ────────────────────────────── */

export function WrapCell({
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

export function DescriptionCell({
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
            <span key={i} style={{ color: "#22D3EE" }}>
              @{seg.value}
            </span>
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

export function FinalPromptCell({ shot, nodeId }: { shot: ScriptShot; nodeId: string }) {
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
      <span className="text-[12px]" style={{ color: "#D1D5DB" }}>
        待生成提示词
      </span>
    </td>
  );
}

/* ── Image cell ────────────────────────────────────────────────────── */

export function ImageCell({
  src,
  onUpload,
  onRemove,
}: {
  src?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cellRef = useRef<HTMLTableCellElement>(null);
  const { uploading, upload } = useAssetUpload();

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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result) onUpload(result.url);
    e.target.value = "";
  };

  return (
    <td ref={cellRef} className="align-top relative" style={{ padding: "6px 8px" }}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {uploading ? (
        <div
          className="rounded flex items-center justify-center"
          style={{ width: 40, height: 30, background: "#F3F4F6" }}
        >
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#9CA3AF" }} />
        </div>
      ) : src ? (
        <div
          className="relative rounded overflow-hidden cursor-pointer group/img"
          style={{ width: 40, height: 30 }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <DemoImg src={src} alt="" className="w-full h-full object-cover" draggable={false} />
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
