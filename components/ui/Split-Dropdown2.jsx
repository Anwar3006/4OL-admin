import { Menu, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import Icon from "@/components/ui/Icon";

const SplitDropdown2 = ({
  label = "Select",
  value: selectedItems,
  onChange,
  wrapperClass = "inline-block",
  labelClass = "",
  inputClass = "",
  classMenuItems = "mt-2 w-80 max-h-60 overflow-y-auto",
  splitIcon = "heroicons-outline:chevron-down",
  items = [{ label: "Male" }, { label: "Female" }],
  classItem = "px-4 py-2",
  isMultiSelect = false,
  required = true,
  multiColumn = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  if (error) console.log("Error: ", error);

  const handleItemClick = (clickedItem) => {
    if (!multiColumn) {
      if (isMultiSelect) {
        const newValue = selectedItems.includes(clickedItem.label)
          ? selectedItems.filter((v) => v !== clickedItem.label)
          : [...selectedItems, clickedItem.label];
        onChange(newValue);
      } else {
        onChange(clickedItem.label);
        setIsOpen(false); // Close dropdown after selection
      }
      return;
    }

    // 1. Check if the clicked item is already selected
    const isAlreadySelected = selectedItems.some(
      (item) => item.resource === clickedItem.resource
    );

    let newSelectedResources;

    if (isAlreadySelected) {
      // 2. If already selected, remove it (Unselect)
      newSelectedResources = selectedItems.filter(
        (item) => item.resource !== clickedItem.resource
      );
    } else {
      // 3. If not selected, add the new object (Select)
      const newItemObject = {
        resource: clickedItem.resource,
        assignedPermission: clickedItem.assignedPermission,
      };
      // Use spread operator to append the new item
      newSelectedResources = [...selectedItems, newItemObject];
    }

    // 4. Pass the new array of selected resource objects back to the parent (RegForm)
    onChange(newSelectedResources);
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
          <div className={`flex-1 cursor-pointer text-sm ${labelClass}`}>
            {label}
            {required && <span className="text-red-500 text-lg">*</span>}
          </div>
        </div>
        <Menu.Button
          className={`flex-0 mb-2 ${labelClass} w-full`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex form-control py-2 capitalize w-full items-center justify-between">
            {Array.isArray(selectedItems) && selectedItems.length > 0
              ? `${selectedItems.length} Permission${selectedItems.length > 1 ? "s" : ""} Selected`
              : selectedItems || "Select"}
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
  ${classMenuItems} custom-scrollbar w-full`}
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

            {multiColumn ? (
              <>
                {/* NEW: Displaying the Privilege Grid */}
                <div className="p-2 w-full">
                  {/* Header */}
                  <div className="grid grid-cols-2 gap-x-4 border-b border-gray-300 pb-1 mb-1 font-bold text-sm dark:text-white ">
                    <div>Resource</div>
                    <div className="text-right">Permissions</div>
                  </div>

                  {/* Rows */}
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-2 gap-x-4 py-2 border-b border-gray-100 dark:border-gray-700"
                    >
                      {/* Column 1: Resource */}
                      <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={selectedItems.some(
                            (selected) => selected.resource === item.resource
                          )}
                          onChange={() => handleItemClick(item)}
                        />
                        {item.resource}
                      </div>

                      {/* Column 2: Permissions */}
                      <div className="text-sm text-slate-500 dark:text-slate-400 text-right">
                        {item.assignedPermission}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
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
                            checked={selectedItems.includes(item.label)}
                            readOnly
                            className="mr-2"
                          />
                        )}
                        {item.label}
                      </div>
                    )}
                  </Menu.Item>
                ))}
              </>
            )}
          </Menu.Items>
        </Transition>
      </Menu>
      {error && (
        <div className={`mt-2 text-danger-500 block text-sm`}>
          {error.message}
        </div>
      )}
    </div>
  );
};

export default SplitDropdown2;
