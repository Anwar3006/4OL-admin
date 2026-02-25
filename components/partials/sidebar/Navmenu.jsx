"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Collapse } from "react-collapse";
import Icon from "@/components/ui/Icon";
import { toggleActiveChat } from "@/components/partials/app/chat/store";
import { useDispatch } from "react-redux";
import useMobileMenu from "@/hooks/useMobileMenu";
import { supabase } from "@/app/utils/supabaseClient";
import Submenu from "./Submenu";
import { authClient } from "@/lib/auth-client";

// Roles that can see the Admins and Delete Account Request menu items
const SUPER_ADMIN_ROLES = ["super_admin", "Super Admin"];

const Navmenu = ({ menus, onLogout }) => {
  const router = useRouter();
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const location = usePathname();
  const locationName = location.replace("/", "");
  const [mobileMenu, setMobileMenu] = useMobileMenu();
  const dispatch = useDispatch();

  // Fetch user role from Supabase
  const fetchUserRole = async () => {
    const sessionResult = await authClient.getSession();
    const userId = sessionResult?.data?.user?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
      } else {
        setUserRole(data?.role);
        localStorage.setItem("user_role", data?.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("facility_profile")
        .select("*")
        .eq("status", "pending"); // lowercase to match facility_status_enum

      if (error) {
        console.error("Error fetching pending reviews:", error);
        return;
      }

      setPendingReviews(data.length || 0);
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
    }
  };

  // Restrict Admin Panel Access
  useEffect(() => {
    if (locationName === "admin" && !SUPER_ADMIN_ROLES.includes(userRole)) {
      router.push("/analytics");
    }
  }, [locationName, userRole]);

  useEffect(() => {
    fetchPendingReviews();
    fetchUserRole();
  }, []);

  const toggleSubmenu = (i) => {
    setActiveSubmenu(activeSubmenu === i ? null : i);
  };

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
    setActiveSubmenu(submenuIndex);
    dispatch(toggleActiveChat(false));
    if (mobileMenu) {
      setMobileMenu(false);
    }
  }, [router, location]);

  const isSuperAdmin = userRole !== null && SUPER_ADMIN_ROLES.includes(userRole);

  return (
    <ul>
      {menus
        .filter((item) => {
          // Hide "Admins" for non-super-admins
          if (item.title === "Admins" && !isSuperAdmin) return false;
          // Hide "Delete Account Request" for non-super-admins
          if (item.title === "Delete Account Request" && !isSuperAdmin) return false;
          return true;
        })
        .map((item, i) => (
          <li
            key={i}
            className={`single-sidebar-menu 
              ${item.child ? "item-has-children" : ""} 
              ${activeSubmenu === i ? "open" : ""} 
              ${locationName === item.link ? "menu-item-active" : ""}`}
          >
            {/* Single menu with no children */}
            {!item.child && !item.isHeadr && item.title !== "Logout" && (
              <Link className="menu-link" href={`/${item.link}`}>
                <span className="menu-icon flex-grow-0">
                  <Icon icon={item.icon} />
                </span>
                <div className="text-box flex-grow">{item.title}</div>
                {item.badge && <span className="menu-badge">{item.badge}</span>}
              </Link>
            )}

            {/* Menu Label */}
            {item.isHeadr && !item.child && (
              <div className="menulabel">{item.title}</div>
            )}

            {/* Submenu Parent */}
            {item.child && (
              <div
                className={`menu-link ${activeSubmenu === i ? "parent_active not-collapsed" : "collapsed"}`}
                onClick={() => toggleSubmenu(i)}
              >
                <div className="flex-1 flex items-start">
                  <span className="menu-icon">
                    <Icon icon={item.icon} />
                  </span>
                  <div className="text-box">{item.title}</div>
                </div>
                <div className="flex-0">
                  <div
                    className={`menu-arrow transform transition-all duration-300 ${activeSubmenu === i ? "rotate-90" : ""}`}
                  >
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
              pendingReviews={pendingReviews}
            />
          </li>
        ))}

      {/* Logout Menu Item */}
      <li className="single-sidebar-menu">
        <div className="menu-link" onClick={onLogout}>
          <span className="menu-icon flex-grow-0">
            <Icon icon="ant-design:logout-outlined" />
          </span>
          <div className="text-box flex-grow">Logout</div>
        </div>
      </li>
    </ul>
  );
};

export default Navmenu;
