import { useCanvas } from "@/store/canvasStore";
import { Save, Share2, Bell, ShoppingBag, User } from "lucide-react";

export function Toolbar() {
  const projectName = useCanvas((s) => s.projectName);
  const setProjectName = useCanvas((s) => s.setProjectName);

  return (
    <header
      className="h-16 px-6 flex items-center justify-between z-30 relative"
      style={{ background: "#F8FAFC" }}
    >
      {/* Left: Brand */}
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-2">
          <div className="w-[42px] h-[42px] rounded-xl bg-[#111827] flex items-center justify-center">
            <span className="text-white text-lg font-bold">P</span>
          </div>
          <span
            className="text-[28px] font-bold"
            style={{ color: "#101828", fontFamily: "Avenir Next, Inter, system-ui" }}
          >
            PhanMovie
          </span>
        </div>

        <div className="w-px h-6" style={{ background: "#D9E0EA" }} />

        <span className="text-lg font-medium" style={{ color: "#667085", fontFamily: "PingFang SC, Inter, system-ui" }}>
          视频生成
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <ActionBtn icon={Save} />
        <ActionBtn icon={Share2} />
        <ActionBtn icon={Bell} badge />

        <button
          className="flex items-center gap-2 rounded-[18px] h-14 px-4"
          style={{ background: "#ECFDFF", border: "1px solid #B2F0F4" }}
        >
          <ShoppingBag className="w-5 h-5" style={{ color: "#0F766E" }} />
          <span className="text-sm font-medium" style={{ color: "#0F766E" }}>商店</span>
        </button>

        <button
          className="flex items-center gap-2.5 rounded-[18px] h-14 px-4"
          style={{ background: "#FFFFFF", border: "1px solid #D8E1EC" }}
        >
          <User className="w-5 h-5" style={{ color: "#667085" }} />
          <span className="text-sm font-medium" style={{ color: "#344054" }}>账户</span>
        </button>
      </div>
    </header>
  );
}

function ActionBtn({ icon: Icon, badge }: { icon: any; badge?: boolean }) {
  return (
    <button
      className="relative flex items-center justify-center rounded-[18px] w-14 h-14"
      style={{ background: "#FFFFFF", border: "1px solid #D8E1EC" }}
    >
      <Icon className="w-5 h-5" style={{ color: "#667085" }} />
      {badge && (
        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
      )}
    </button>
  );
}
