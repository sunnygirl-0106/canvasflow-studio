import { useState, useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function DialoguePopover({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const addLine = (prefix: string) => {
    setDraft((d) => (d ? d + "\n" : "") + `${prefix}: `);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="cursor-pointer"
        style={{
          color: "#374151",
          lineHeight: 1.6,
          whiteSpace: "normal",
          wordBreak: "break-all",
          maxWidth: 180,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}
        onClick={() => setOpen(true)}
      >
        {value || <span style={{ color: "#D1D5DB" }}>--</span>}
      </div>

      {open && (
        <div
          className="absolute z-50 rounded-xl"
          style={{
            top: "100%",
            left: 0,
            marginTop: 4,
            width: 320,
            background: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
            border: "1px solid #E5E7EB",
            padding: 16,
          }}
        >
          <textarea
            className="w-full rounded-lg text-[13px] outline-none resize-none"
            style={{
              padding: "10px 12px",
              minHeight: 100,
              border: "1px solid #E5E7EB",
              color: "#1A1A1A",
              fontFamily: "PingFang SC, Inter, system-ui",
            }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              className="text-[12px] font-medium rounded-lg transition-colors hover:bg-gray-100"
              style={{
                padding: "6px 12px",
                border: "1px solid #E5E7EB",
                color: "#374151",
              }}
              onClick={() => addLine("台词")}
            >
              + 台词
            </button>
            <button
              className="text-[12px] font-medium rounded-lg transition-colors hover:bg-gray-100"
              style={{
                padding: "6px 12px",
                border: "1px solid #E5E7EB",
                color: "#374151",
              }}
              onClick={() => addLine("旁白")}
            >
              + 旁白
            </button>
            <div className="flex-1" />
            <button
              className="text-[12px] font-medium rounded-lg text-white transition-colors hover:opacity-90"
              style={{
                padding: "6px 16px",
                background: "#1F2937",
              }}
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
