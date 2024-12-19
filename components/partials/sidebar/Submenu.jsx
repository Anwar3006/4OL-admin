import React, { useState } from "react";
import { Collapse } from "react-collapse";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Multilevel from "./Multi";

const Submenu = ({ activeSubmenu, item, i, locationName, pendingReviews }) => {
  const [activeMultiMenu, setMultiMenu] = useState(null);
  const toggleMultiMenu = (j) => {
    if (activeMultiMenu === j) {
      setMultiMenu(null);
    } else {
      setMultiMenu(j);
    }
  };

  return (
    <Collapse isOpened={activeSubmenu === i}>
      <ul className="sub-menu space-y-3">
        {item.child?.map((subItem, j) => (
          <li key={j} className="block pl-4 pr-1 first:pt-4 last:pb-4">
            {subItem?.multi_menu ? (
              <div>
                <div
                  onClick={() => toggleMultiMenu(j)}
                  className={`${
                    activeMultiMenu
                      ? "text-black dark:text-white font-medium"
                      : "text-slate-600 dark:text-slate-300"
                  } text-sm flex space-x-3 items-center transition-all duration-150 cursor-pointer`}
                >
                  <span
                    className={`${
                      activeMultiMenu
                        ? "bg-slate-900 dark:bg-slate-300 ring-4 ring-opacity-[15%] ring-black-500 dark:ring-slate-300 dark:ring-opacity-20"
                        : ""
                    } h-2 w-2 rounded-full border border-slate-600 dark:border-white inline-block flex-none`}
                  ></span>
                  <span className="flex">{subItem.childtitle}</span>
                  {subItem.childtitle === "Pending Reviews" && (
                    <span className="text-gray-600 ml-2">{pendingReviews}</span>
                  )}
                  <span className="flex-none">
                    <span
                      className={`menu-arrow transform transition-all duration-300 ${
                        activeMultiMenu === j ? "rotate-90" : ""
                      }`}
                    >
                      <Icon icon="ph:caret-right" />
                    </span>
                  </span>
                </div>
                <Multilevel
                  activeMultiMenu={activeMultiMenu}
                  j={j}
                  subItem={subItem}
                  locationName={locationName}
                />
              </div>
            ) : (
              <Link href={subItem.childlink}>
                <span
                  className={`${
                    locationName === subItem.childlink
                      ? "text-black dark:text-white font-medium"
                      : "text-slate-600 dark:text-slate-300"
                  } text-sm flex space-x-3 items-center transition-all duration-150`}
                >
                  <s
                    pan
                    className={`${
                      locationName === subItem.childlink
                        ? "bg-slate-900 dark:bg-slate-300 ring-4 ring-opacity-[15%] ring-black-500 dark:ring-slate-300 dark:ring-opacity-20"
                        : ""
                    } h-2 w-2 rounded-full border border-slate-600 dark:border-white inline-block flex-none`}
                  ></s>
                  <span className="flex-1">{subItem.childtitle}</span>
                  {subItem.childtitle === "Pending Reviews" && (
                    <span className="text-gray-800 ml-2  text-sm flex items-center justify-center text-center rounded-full">
                      ({pendingReviews})
                    </span>
                  )}
                  {/* {subItem.count > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {subItem.count}
                    </span>
                  )} */}
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Collapse>
  );
};

export default Submenu;
