import React, { useState } from "react";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";

const Accordion = ({
  question,
  answer,
  onEdit,
  onDelete,
  className = "",
  questionClassName = "",
  answerClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={`border border-slate-200 dark:border-slate-700 rounded-md mb-5 ${className}`}
    >
      <div
        className={`flex justify-between items-center p-4 cursor-pointer ${questionClassName}`}
        onClick={toggleAccordion}
      >
        <h6 className="text-base font-medium text-slate-800 dark:text-slate-600">
          {question}
        </h6>
        <div className="flex items-center space-x-2">
          <Button
            icon="heroicons-outline:pencil-alt"
            iconClass="text-green-500 text-xl"
            className="p-0 bg-transparent border-none"
            onClick={(e) => {
              e.stopPropagation();
              onEdit && onEdit();
            }}
          />
          <Button
            icon="heroicons-outline:trash"
            iconClass="text-red-500 text-xl"
            className="p-0 bg-transparent border-none"
            onClick={(e) => {
              e.stopPropagation();
              onDelete && onDelete();
            }}
          />
          <Icon
            icon="heroicons-outline:chevron-down"
            className={`text-slate-500 transform transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>
      {isOpen && (
        <div
          className={`p-4 border-t border-slate-200 dark:border-slate-700 ${answerClassName}`}
        >
          <p className="text-slate-600 dark:text-slate-400 text-base">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default Accordion;
