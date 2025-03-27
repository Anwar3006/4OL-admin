import React from "react";

const Modal = ({
  title,
  titleClass,
  activeModal,
  onClose,
  children,
  centered,
  themeClass,
}) => {
  if (!activeModal) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div
        className={`relative bg-white rounded shadow-lg ${themeClass} ${
          centered ? "mx-auto" : ""
        } p-4`}
      >
        {title && (
          <h2 className={`text-xl font-bold mb-4 ${titleClass}`}>{title}</h2>
        )}
        {children}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Modal;
