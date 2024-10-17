import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

const Dropdown = ({
  label,
  wrapperClass = "inline-block",
  labelClass = "label-class-custom",
  onSelect, // New prop to handle selection
  classMenuItems = "mt-2 w-[220px]",
  items = [],
  classItem = "px-4 py-2",
  className = "",
  selectedItem, // New prop to show the selected item
}) => {
  return (
    <div className={`relative ${wrapperClass}`}>
      <Menu as="div" className={`block w-full ${className}`}>
        <Menu.Button className="block w-full">
          <div className={labelClass}>{selectedItem || label}</div>
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className={`absolute w-full ltr:right-0 rtl:left-0 origin-top-right border border-slate-100
            rounded bg-white dark:bg-slate-800 dark:border-slate-700 shadow-dropdown z-[9999]
            ${classMenuItems}`}
          >
            <div>
              {items.map((item, index) => (
                <Menu.Item key={index}>
                  {({ active }) => (
                    <div
                      className={`${
                        active
                          ? "bg-slate-100 text-slate-900 dark:bg-slate-600 dark:text-slate-300 dark:bg-opacity-50"
                          : "text-slate-600 dark:text-slate-300 w-full"
                      } block w-full`}  // Ensure full width
                      onClick={() => {
                        if (onSelect) onSelect(item.label); // Call the onSelect function
                      }}
                    >
                      {item.link ? (
                        <Link href={item.link} className={`block w-full hover:bg-gray-100 ${classItem}`}>
                          {item.icon ? (
                            <div className="flex items-center w-full">
                              <span className="block text-xl ltr:mr-3 rtl:ml-3">
                                <Icon icon={item.icon} />
                              </span>
                              <span className="block text-sm w-full">{item.label}</span>
                            </div>
                          ) : (
                            <span className="block text-sm w-full">{item.label}</span>
                          )}
                        </Link>
                      ) : (
                        <div className={`block cursor-pointer w-full hover:bg-gray-100 ${classItem}`}>
                          {item.icon ? (
                            <div className="flex items-center w-full">
                              <span className="block text-xl ltr:mr-3 rtl:ml-3">
                                <Icon icon={item.icon} />
                              </span>
                              <span className="block text-sm w-full">{item.label}</span>
                            </div>
                          ) : (
                            <span className="block text-sm w-full">{item.label}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};

export default Dropdown;
