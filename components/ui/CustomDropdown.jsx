"use client";
import { Icon } from "@iconify/react";
import React, { useState, useRef, useEffect } from "react";

const CustomDropdown = ({ options, selectedValue, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="relative inline-block w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border z-10 flex justify-between items-center border-gray-300 rounded p-2 text-left focus:outline-none focus:ring-2 focus:ring-secondary-800"
      >
        {selectedValue}
        <Icon icon={isOpen ? "bi:caret-up-fill" : "bi:caret-down-fill"} className="" />
      </button>
      {isOpen && (
        <ul className="absolute z-[1000] w-28 bg-white border border-gray-300 rounded shadow-lg mt-1"
        style={{ position: "absolute", zIndex: 1000 }}>
          {options.map((option) => (
            <li
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="cursor-pointer px-2 py-2 hover:bg-secondary-800 hover:text-white"
            >
              {option}
             
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomDropdown;
