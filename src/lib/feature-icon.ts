import type { IconName } from "@/components/ui/Icon";

/** Map a free-text fleet feature label to the closest icon. Shared by the fleet
 *  carousel and the vehicle detail page so they show the same glyphs. */
export function featureIcon(label: string): IconName {
  const s = label.toLowerCase();
  if (/air.?con/.test(s)) return "snow";
  if (/usb|charg|power/.test(s)) return "usb";
  if (/luggage|hold/.test(s)) return "luggage";
  if (/reclin|seat/.test(s)) return "seat";
  if (/wifi/.test(s)) return "wifi";
  if (/wc|washroom|toilet/.test(s)) return "wc";
  if (/table/.test(s)) return "table";
  if (/pa |speaker|sound|audio|announce/.test(s)) return "speaker";
  if (/fridge|drink|cool/.test(s)) return "fridge";
  if (/dvd|screen|\btv\b|entertain/.test(s)) return "tv";
  return "check";
}
