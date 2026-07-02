import { useState, useRef, useEffect } from "react";
import { DemoImg } from "@/components/DemoImg";
import { Loader2 } from "lucide-react";
import type { ScriptShot } from "@canvasflow/shared";
import { parseDescription } from "@/lib/assetUtils";
import { useAssetUpload } from "@/lib/useAssetUpload";
import { FinalPromptModal } from "./FinalPromptModal";
import { CellPopover } from "./CellPopover";

/* ── Wrapping text cell (popover editor) ───────────────────────────── */

export function WrapCell({
  value,
  onChange,
  placeholder,
  style: extraStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td className="align-top" style={{ padding: "10px 12px", ...extraStyle }}>
      <CellPopover value={value} onChange={onChange} placeholder={placeholder} />
    </td>
  );
}

/* ── Description cell with @mention highlights ────────────────────── */

export function DescriptionCell({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <td className="align-top" style={{ padding: "10px 12px" }}>
      <CellPopover
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        renderValue={(v) => {
          const segments = parseDescription(v);
          return segments.map((seg, i) =>
            seg.type === "mention" ? (
              <span key={i} style={{ color: "#22D3EE" }}>
                @{seg.value}
              </span>
            ) : (
              <span key={i}>{seg.value}</span>
            ),
          );
        }}
      />
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
          style={{ color: "#14B8A6" }}
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
      <span className="text-[12px]" style={{ color: "#6B7280" }}>
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
          style={{ width: 40, height: 30, background: "#2A2D33" }}
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
          className="rounded flex items-center justify-center text-[11px] font-medium transition-colors hover:bg-white/5"
          style={{
            width: 40,
            height: 30,
            border: "1px dashed #3F4248",
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
            background: "#1F2125",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            border: "1px solid #2A2D33",
          }}
        >
          <button
            className="w-full text-left text-[13px] hover:bg-white/5 transition-colors"
            style={{ padding: "10px 16px", color: "#E5E7EB" }}
            onClick={() => {
              setMenuOpen(false);
              fileRef.current?.click();
            }}
          >
            本地上传
          </button>
          <button
            className="w-full text-left text-[13px] hover:bg-white/5 transition-colors"
            style={{ padding: "10px 16px", color: "#E5E7EB", borderTop: "1px solid #2A2D33" }}
            onClick={() => {
              setMenuOpen(false);
            }}
          >
            历史图库
          </button>
          {src && (
            <button
              className="w-full text-left text-[13px] hover:bg-red-500/10 transition-colors"
              style={{ padding: "10px 16px", color: "#EF4444", borderTop: "1px solid #2A2D33" }}
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
