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

const Navmenu = ({ menus, onLogout }) => {
  const router = useRouter();
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [userRole, setUserRole] = useState(null);  // state to store user role
  const location = usePathname();
  const locationName = location.replace("/", "");
  const [mobileMenu, setMobileMenu] = useMobileMenu();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  // Function to fetch user role from Supabase
  const fetchUserRole = async () => {
    const userId = localStorage.getItem("user_id");  // assuming user_id is stored in localStorage
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
      } else {
        setUserRole(data?.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("healthcare_profiles") // Replace with your actual table name
        .select("*")
        .eq("status", "Pending"); // Adjust based on your schema
  
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
      if (locationName === "admin" && userRole !== "Super Admin") {
        // Redirect unauthorized users to the analytics page
        router.push("/analytics");
      }
    }, [locationName, userRole]);

  // Fetch the data once on mount
  useEffect(() => {
    fetchPendingReviews();
    fetchUserRole();  // Fetch role when the component mounts
  }, []);  // Only run once when component mounts

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

  return (
    <ul>
      {menus
        .filter((item) => {
          // Conditionally filter out the Admin menu based on user role
          if (item.title === "Admins" && userRole !== "Super Admin") {
            return false;  // Hide "Admins" menu if the role is not "super admin"
          }
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
              <Link className="menu-link" href={item.link}>
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
