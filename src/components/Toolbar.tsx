import { Share2, Bell, Gift, ArrowUp, Infinity as InfinityIcon } from "lucide-react";

export function Toolbar() {
  return (
    <header
      className="h-16 px-6 flex items-center justify-between z-30 relative"
      style={{ background: "#FFFFFF" }}
    >
      {/* Left: Brand + scene tabs */}
      <div className="flex items-center gap-5 h-full">
        <div className="flex items-center gap-2">
          {/* // logo */}
          <div className="flex items-center justify-center" style={{ width: 32, height: 32 }}>
            <svg width="30" height="22" viewBox="0 0 30 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 19L13 3" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
              <path d="M17 19L27 3" stroke="#34D399" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <span
            className="text-[22px] font-bold tracking-tight"
            style={{ color: "#0F172A", fontFamily: "Inter, Avenir Next, system-ui" }}
          >
            PhanthyMovie
          </span>
        </div>

        <div className="w-px h-5" style={{ background: "#E2E8F0" }} />

        <div className="flex items-center gap-5">
          <button
            className="text-[15px] font-semibold"
            style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            场景
          </button>
          <button
            className="flex items-center gap-1.5 text-[15px] font-semibold"
            style={{ color: "#0F172A", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            场景测试
            <span
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: "#22C55E" }}
            />
          </button>
        </div>
      </div>

      {/* Center: Back to project */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <button
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium"
          style={{
            background: "#F1F5F9",
            color: "#475569",
            border: "1px solid #E2E8F0",
          }}
        >
          <ArrowUp className="w-3.5 h-3.5" />
          返回项目
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        <IconBtn icon={Share2} />
        <IconBtn icon={Bell} badge />

        {/* 会员超市 */}
        <button
          className="flex items-center gap-1.5 rounded-full h-10 px-3.5"
          style={{
            background: "#ECFEFF",
            border: "1px solid #A5F3FC",
          }}
        >
          <Gift className="w-4 h-4" style={{ color: "#0E7490" }} />
          <span
            className="text-[13px] font-semibold"
            style={{ color: "#0E7490", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            会员超市
          </span>
        </button>

        {/* 星钻 (无限) */}
        <button
          className="flex items-center gap-1.5 rounded-full h-10 pl-3 pr-3.5"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
          }}
        >
          {/* coin/diamond glyph */}
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{
              width: 18,
              height: 18,
              background:
                "linear-gradient(135deg, #FDE68A 0%, #F59E0B 60%, #B45309 100%)",
              boxShadow: "inset 0 -1px 1px rgba(0,0,0,0.1)",
            }}
          />
          <span
            className="text-[13px] font-semibold"
            style={{ color: "#1F2937", fontFamily: "PingFang SC, Inter, system-ui" }}
          >
            星钻
          </span>
          <InfinityIcon className="w-4 h-4" style={{ color: "#1F2937" }} strokeWidth={2.5} />
        </button>

        {/* Avatar */}
        <div
          className="flex items-center justify-center rounded-full text-white text-[12px] font-bold"
          style={{
            width: 36,
            height: 36,
            background:
              "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)",
            fontFamily: "Inter, system-ui",
          }}
        >
          AD
        </div>
      </div>
    </header>
  );
}

function IconBtn({ icon: Icon, badge }: { icon: any; badge?: boolean }) {
  return (
    <button
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: 40,
        height: 40,
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
      }}
    >
      <Icon className="w-[18px] h-[18px]" style={{ color: "#475569" }} />
      {badge && (
        <span
          className="absolute"
          style={{
            top: 9,
            right: 11,
            width: 7,
            height: 7,
            borderRadius: 9999,
            background: "#EF4444",
            border: "2px solid #FFFFFF",
          }}
        />
      )}
    </button>
  );
}
