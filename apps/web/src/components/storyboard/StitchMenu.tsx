import { MenuPanel, MenuItem } from "@/components/ui/Menu";

interface StitchMenuProps {
  onSelect: (resolution: "2K" | "4K") => void;
  onClose: () => void;
}

const FONT = "PingFang SC, Inter, system-ui";

export function StitchMenu({ onSelect, onClose }: StitchMenuProps) {
  return (
    <MenuPanel minWidth={180}>
      {(["2K", "4K"] as const).map((res) => (
        <MenuItem
          key={res}
          fontFamily={FONT}
          onClick={() => {
            onSelect(res);
            onClose();
          }}
        >
          拼接 {res}
        </MenuItem>
      ))}
    </MenuPanel>
  );
}
