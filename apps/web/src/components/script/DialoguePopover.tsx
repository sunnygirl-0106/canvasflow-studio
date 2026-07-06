import { CellPopover } from "./CellPopover";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const quickBtn = "text-[12px] font-medium rounded-lg transition-colors hover:bg-white/5";
const quickStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #2A2D33",
  color: "#E5E7EB",
};

export function DialoguePopover({ value, onChange }: Props) {
  return (
    <CellPopover
      value={value}
      onChange={onChange}
      emptyIndicator="+"
      placeholder="输入台词或旁白，例如：台词: 今天的风好舒服啊……"
      extraButtons={(append) => (
        <>
          <button className={quickBtn} style={quickStyle} onClick={() => append("台词: ")}>
            + 台词
          </button>
          <button className={quickBtn} style={quickStyle} onClick={() => append("旁白: ")}>
            + 旁白
          </button>
        </>
      )}
    />
  );
}
