import { STORYBOARD_RATIOS, type AspectRatio } from "@/store/canvasStore";
import { MenuPanel, MenuItem } from "@/components/ui/Menu";

interface RatioMenuProps {
  current: AspectRatio;
  onSelect: (ratio: AspectRatio) => void;
  onClose: () => void;
}

export function RatioMenu({ current, onSelect, onClose }: RatioMenuProps) {
  return (
    <MenuPanel>
      {STORYBOARD_RATIOS.map((r) => (
        <MenuItem
          key={r}
          active={r === current}
          onClick={() => {
            onSelect(r);
            onClose();
          }}
        >
          {r}
          {r === current && (
            <span className="ml-auto text-[11px]" style={{ color: "#0F766E" }}>
              ✓
            </span>
          )}
        </MenuItem>
      ))}
    </MenuPanel>
  );
}
