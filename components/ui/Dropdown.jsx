import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

const Dropdown = ({
  label,
  wrapperClass = "inline-block",
  labelClass = "",
  classMenuItems = "mt-2 w-[220px]",
  items = [],
  classItem = "px-4 py-2",
  className = "",
  onSelect,
}) => {
  return (
    <div className={`relative ${wrapperClass}`}>
      <Menu as="div" className={`block ${className}`}>
        {/* Dropdown Toggle */}
        <Menu.Button className="block">
          <div className={labelClass}>{label}</div>
        </Menu.Button>

        {/* Dropdown Menu Items */}
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
            className={`absolute ltr:right-0 rtl:left-0 border border-slate-100 rounded bg-white shadow-dropdown z-[9999] ${classMenuItems}`}
          >
            {items.map((item, index) => (
              <Menu.Item key={index}>
                {({ active }) => (
                  <div
                    className={`${
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600"
                    } block cursor-pointer w-full ${classItem}`}
                    onClick={() => {
                      if (onSelect) onSelect(item.label);
                      if (item.action) item.action(); // Trigger item action
                    }}
                  >
                    {item.icon ? (
                      <div className="flex items-center">
                        <span className="text-xl ltr:mr-3 rtl:ml-3">
                          <Icon icon={item.icon} />
                        </span>
                        <span>{item.label}</span>
                      </div>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </div>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};

export default Dropdown;
