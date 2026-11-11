import { Mountain, Cog, Baby, Flower2, Route, Zap, Package, Settings, HardHat, CircleDot, Lightbulb, Wrench } from "lucide-react";

const ICONS = { Mountain, Cog, Baby, Flower2, Route, Zap, Package, Settings, HardHat, CircleDot, Lightbulb, Wrench };
export const ICON_NAMES = Object.keys(ICONS);

export const CategoryIcon = ({ name, className = "h-5 w-5" }) => {
  const I = ICONS[name] || Package;
  return <I className={className} strokeWidth={1.75} />;
};
