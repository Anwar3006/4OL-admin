import { Menu, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import Icon from "@/components/ui/Icon";

const SplitDropdown2 = ({
  label = "Select",
  value,
  onChange,
  wrapperClass = "inline-block",
  labelClass = "",
  inputClass = "",
  classMenuItems = "mt-2 w-[250px] max-h-60 overflow-y-auto",
  splitIcon = "heroicons-outline:chevron-down",
  items = [{ label: "Male" }, { label: "Female" }],
  classItem = "px-4 py-2",
  isMultiSelect = false,
  required = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleItemClick = (item) => {
    if (isMultiSelect) {
      const newValue = value.includes(item.label)
        ? value.filter((v) => v !== item.label)
        : [...value, item.label];
      onChange(newValue);
    } else {
      onChange(item.label);
      setIsOpen(false); // Close dropdown after selection
    }
  };

  const handleAddItem = () => {
    if (inputValue.trim()) {
      const newItem = { label: inputValue.trim() };
      handleItemClick(newItem);
      setInputValue("");
    }
  };

  return (
    <div className={`relative ${wrapperClass}`}>
      <Menu as="div" className="block w-full">
        <div className="split-btngroup flex">
          <div className={`flex-1 cursor-pointer ${labelClass}`}>
            {label}
            {required && <span className="text-red-500 text-lg">*</span>}
          </div>
        </div>
        <Menu.Button
          className={`flex-0 mb-2 ${labelClass}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex form-control py-2 capitalize">
            {isMultiSelect
              ? Array.isArray(value) && value.length > 0
                ? value.join(", ")
                : "Select"
              : value || "Select"}
            <span className="ml-4 flex items-center">
              <Icon icon={splitIcon} />
            </span>
          </div>
        </Menu.Button>

        <Transition
          as={Fragment}
          show={isOpen}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className={`absolute ltr:left-0 rtl:left-0 origin-top-right border border-slate-100 cursor-pointer
  rounded bg-white dark:bg-slate-800 dark:border-slate-700 shadow-dropdown z-[9999]
  ${classMenuItems} custom-scrollbar`}
          >
            <div className={`p-2 ${inputClass}`}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="Add new item..."
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 capitalize"
              />
            </div>
            {items.map((item, index) => (
              <Menu.Item key={index}>
                {({ active }) => (
                  <div
                    className={`${
                      active
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-600 dark:text-slate-300 dark:bg-opacity-50"
                        : "text-slate-600 dark:text-slate-300"
                    } block ${classItem} flex items-center`}
                    onClick={() => handleItemClick(item)}
                  >
                    {isMultiSelect && (
                      <input
                        type="checkbox"
                        checked={value.includes(item.label)}
                        readOnly
                        className="mr-2"
                      />
                    )}
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
