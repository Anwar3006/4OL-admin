import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState, memo } from "react";
import Link from "next/link";
import { Collapse } from "react-collapse";
import Icon from "@/components/ui/Icon";
import { toggleActiveChat } from "@/components/partials/app/chat/store";
import { useDispatch } from "react-redux";
import useMobileMenu from "@/hooks/useMobileMenu";
import Submenu from "./Submenu";

// Memoized MenuItem Component
const MenuItem = memo(({ item, i, activeSubmenu, locationName, toggleSubmenu }) => (
  <li
    key={i}
    className={`single-sidebar-menu 
      ${item.child ? "item-has-children" : ""}
      ${activeSubmenu === i ? "open" : ""}
      ${locationName === item.link ? "menu-item-active bg-[#56ce84]" : ""}`}
  >
    {/* Single menu with no children */}
    {!item.child && !item.isHeadr && (
      <Link className={`menu-link  ${
        activeSubmenu === i ? "rotate-90 " : ""
      }`} href={item.link}>
        <span className="menu-icon flex-grow-0">
          <Icon icon={item.icon} />
        </span>
        <div className="text-box flex-grow text-base">{item.title}</div>
        {item.badge && <span className="menu-badge">{item.badge}</span>}
      </Link>
    )}
    {/* Only for menu label */}
    {item.isHeadr && !item.child && (
      <div className="my-5 font-semibold text-xl">{item.title}</div>
    )}
    {/* Submenu parent */}
    {item.child && (
    <div
    className={`menu ${
      activeSubmenu === i
        ? "parent_active not-collapsed"
        : "collapsed"
    }`}
    onClick={() => toggleSubmenu(i)}
  >
    <div className="flex items-center justify-between w-full py-2 cursor-pointer">
      <div className="flex items-center">
        <span className="menu-icon">
          <Icon icon={item.icon} />
        </span>
        <div className="text-box">{item.title}</div>
      </div>
      <div className="menu-arrow transform transition-all duration-300">
        <Icon icon="heroicons-outline:chevron-right" />
      </div>
    </div>
  </div>
  
    )}

    <Submenu
      activeSubmenu={activeSubmenu}
      item={item}
      i={i}
      locationName={locationName}
    />
  </li>
));

const Navmenu = ({ menus }) => {
  const router = useRouter();
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  const toggleSubmenu = (i) => {
    setActiveSubmenu((prev) => (prev === i ? null : i));
  };

  const location = usePathname();
  const locationName = location.replace("#", "");

  const [mobileMenu, setMobileMenu] = useMobileMenu();
  const dispatch = useDispatch();

  useEffect(() => {
    let submenuIndex = null;
    menus.forEach((item, i) => {
      if (!item.child) return;
      if (item.link === locationName) {
        submenuIndex = null;
      } else {
        const ciIndex = item.child.findIndex(
          (ci) => ci.childlink === locationName
        );
        if (ciIndex !== -1) {
          submenuIndex = i;
        }
      }
    });

    if (submenuIndex !== activeSubmenu) {
      setActiveSubmenu(submenuIndex);
    }

    dispatch(toggleActiveChat(false));
    if (mobileMenu) {
      setMobileMenu(false);
    }
  }, [locationName, mobileMenu, activeSubmenu, menus, dispatch, setMobileMenu]);

  return (
    <ul>
      {menus.map((item, i) => (
        <MenuItem
          key={i}
          item={item}
          i={i}
          activeSubmenu={activeSubmenu}
          locationName={locationName}
          toggleSubmenu={toggleSubmenu}
        />
      ))}
    </ul>
  );
};

export default Navmenu;
