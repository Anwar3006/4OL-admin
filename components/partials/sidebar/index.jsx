// components/partials/sidebar/index.jsx
import React, { useRef, useEffect, useState } from "react";
import SidebarLogo from "./Logo";
import Navmenu from "./Navmenu";
import { menuItems } from "@/constant/data";
import SimpleBar from "simplebar-react";
import useSidebar from "@/hooks/useSidebar";
import useSemiDark from "@/hooks/useSemiDark";
import useSkin from "@/hooks/useSkin";
import { useDispatch } from "react-redux";
import { handleLogout } from "../auth/store";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

const Sidebar = () => {
  const dispatch = useDispatch();
  const scrollableNodeRef = useRef();
  const [scroll, setScroll] = useState(false);
  const { getAllowedMenuItemsForUser, isSuperAdmin, loading } =
    usePermissions();
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);

  console.log("Allowed Menu Items: ", getAllowedMenuItemsForUser());

  useEffect(() => {
    const handleScroll = () => {
      if (scrollableNodeRef.current.scrollTop > 0) {
        setScroll(true);
      } else {
        setScroll(false);
      }
    };
    scrollableNodeRef.current.addEventListener("scroll", handleScroll);
  }, [scrollableNodeRef]);

  // Filter menu items based on user permissions
  useEffect(() => {
    if (!loading) {
      filterMenuItems();
    }
  }, [loading]);

  const filterMenuItems = () => {
    // Super Admin sees all menu items
    if (isSuperAdmin()) {
      setFilteredMenuItems(menuItems);
      return;
    }

    // Get allowed menu items for the user
    const allowedItems = getAllowedMenuItemsForUser();

    // Filter menu items based on permissions
    const filtered = menuItems
      .filter((item) => {
        // If no title, keep it (might be a header)
        if (!item.title) return true;

        // Check if this menu item is in the allowed list
        return allowedItems.includes(item.title);
      })
      .map((item) => {
        // If item has children, filter those too
        if (item.child && item.child.length > 0) {
          return {
            ...item,
            child: item.child.filter((childItem) => {
              // You can add more granular filtering here if needed
              return true; // For now, if parent is allowed, show all children
            }),
          };
        }
        return item;
      });

    setFilteredMenuItems(filtered);
  };

  const [collapsed, setMenuCollapsed] = useSidebar();
  const [menuHover, setMenuHover] = useState(false);
  const router = useRouter();

  // Logout action handler
  const handleLogoutAction = () => {
    console.log("Logout button clicked");
    dispatch(handleLogout(false));
    router.push("/");
  };

  // semi dark option
  const [isSemiDark] = useSemiDark();
  // skin
  const [skin] = useSkin();

  return (
    <div className={isSemiDark ? "dark" : ""}>
      <div
        className={`sidebar-wrapper bg-white dark:bg-slate-800     ${
          collapsed ? "w-[72px] close_sidebar" : "w-[248px]"
        }
      ${menuHover ? "sidebar-hovered" : ""}
      ${
        skin === "bordered"
          ? "border-r border-slate-200 dark:border-slate-700"
          : "shadow-base"
      }
      `}
        onMouseEnter={() => {
          setMenuHover(true);
        }}
        onMouseLeave={() => {
          setMenuHover(false);
        }}
      >
        <SidebarLogo menuHover={menuHover} />
        <div
          className={`h-[60px]  absolute top-[80px] nav-shadow z-[1] w-full transition-all duration-200 pointer-events-none ${
            scroll ? " opacity-100" : " opacity-0"
          }`}
        ></div>

        <SimpleBar
          className="sidebar-menu px-4 h-[calc(100%-90px)]"
          scrollableNodeProps={{ ref: scrollableNodeRef }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Navmenu menus={filteredMenuItems} onLogout={handleLogoutAction} />
          )}
        </SimpleBar>
      </div>
    </div>
  );
};

export default Sidebar;
