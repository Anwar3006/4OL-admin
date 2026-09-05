import type { ComponentProps } from "react";

import { Icon } from "@iconify/react";

/**
 * Thin wrapper over @iconify/react's Icon, kept because the legacy pages
 * import it by this path. The only reason it exists is the name collision:
 * the library's export is also called `Icon`.
 *
 * The prop types are derived from the library's own rather than restated, so
 * they cannot drift out of sync with the installed version — restating them
 * is how `rotate` ended up typed as `string | number` here when Iconify only
 * accepts a number.
 */
export type IconsProps = Pick<
  ComponentProps<typeof Icon>,
  "icon" | "className" | "width" | "rotate" | "hFlip" | "vFlip"
>;

const Icons = ({ icon, className, width, rotate, hFlip, vFlip }: IconsProps) => (
  <Icon
    width={width}
    rotate={rotate}
    hFlip={hFlip}
    icon={icon}
    className={className}
    vFlip={vFlip}
  />
);

export default Icons;
