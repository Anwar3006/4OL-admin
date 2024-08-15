import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import Icon from "@/components/ui/Icon";
import Textinput from "./Textinput";

const SplitDropdown2 = ({
  label = "Select",
  value,
  onChange,
  wrapperClass = "inline-block",
  labelClass = "",
  classMenuItems = "mt-2 w-[220px]",
  splitIcon = "heroicons-outline:chevron-down",
  items = [
    { label: "Male" },
    { label: "Female" }
  ],
  classItem = "px-4 py-2"
}) => {
  return (
    <div className={`relative ${wrapperClass}`}>
      <Menu as="div" className="block w-full">
        <div className="split-btngroup flex">
          <div
            className={`flex-1 cursor-pointer ${labelClass}`}
          >
            {label}
          </div>
        </div>
          <Menu.Button className={`flex-0 mb-2 ${labelClass}`}>
          <div className="flex form-control py-2">
          {value || 'Select'}  <span className="ml-4 flex items-center"><Icon icon={splitIcon} /></span>
            </div>
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
            className={`absolute ltr:left-0 rtl:left-0 origin-top-right border border-slate-100
            rounded bg-white dark:bg-slate-800 dark:border-slate-700 shadow-dropdown z-[9999]
            ${classMenuItems}`}
          >
            {items.map((item, index) => (
              <Menu.Item key={index}>
                {({ active }) => (
                  <div
                    className={`${
                      active
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-600 dark:text-slate-300 dark:bg-opacity-50"
                        : "text-slate-600 dark:text-slate-300"
                    } block ${classItem}`}
                    onClick={() => onChange(item.label)}
                  >
                    {item.label}
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

export default SplitDropdown2;
