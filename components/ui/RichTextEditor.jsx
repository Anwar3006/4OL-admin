"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import ReactQuill with proper CSS loading
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill");
    // Import CSS
    await import("react-quill/dist/quill.snow.css");
    return RQ;
  },
  { 
    ssr: false,
    loading: () => (
      <div className="border border-gray-300 rounded-lg">
        <div className="h-10 bg-gray-100 border-b border-gray-300 rounded-t-lg flex items-center px-3">
          <div className="flex space-x-2">
            <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
            <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
            <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="h-32 bg-white rounded-b-lg flex items-center justify-center">
          <span className="text-gray-500 text-sm">Loading editor...</span>
        </div>
      </div>
    )
  }
);

const RichTextEditor = ({
  name,
  label,
  placeholder = "",
  value = "",
  onChange,
  error,
  defaultValue = "",
  className = "",
  ...props
}) => {
  const [mounted, setMounted] = useState(false);
  const [editorValue, setEditorValue] = useState(value || defaultValue || "");
  const quillRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEditorValue(value || defaultValue || "");
  }, [value, defaultValue]);

  const modules = useMemo(
    () => ({
      toolbar: [
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link"],
        ["clean"]
      ],
    }),
    []
  );

  const formats = [
    "bold",
    "italic",
    "underline",
    "list",
    "bullet",
    "align",
    "link",
  ];

  const handleChange = (content, delta, source, editor) => {
    setEditorValue(content);
    if (onChange) {
      onChange(content);
    }
  };

  if (!mounted) {
    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label
            htmlFor={name}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <div className="border border-gray-300 rounded-lg">
          <div className="h-10 bg-gray-100 border-b border-gray-300 rounded-t-lg flex items-center px-3">
            <div className="flex space-x-2">
              <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="h-32 bg-white rounded-b-lg flex items-center justify-center">
            <span className="text-gray-500 text-sm">Loading editor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}
      <div className="rich-text-editor">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={editorValue}
          onChange={handleChange}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          style={{
            backgroundColor: "white",
            borderRadius: "0.375rem",
          }}
          {...props}
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message}</p>
      )}
      
      <style jsx global>{`
        .rich-text-editor .ql-editor {
          min-height: 80px;
          font-size: 14px;
          line-height: 1.5;
          padding: 12px 15px;
        }
        .rich-text-editor .ql-toolbar {
          border-top: 1px solid #d1d5db;
          border-left: 1px solid #d1d5db;
          border-right: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
          border-radius: 0.375rem 0.375rem 0 0;
          background-color: #f9fafb;
        }
        .rich-text-editor .ql-container {
          border-bottom: 1px solid #d1d5db;
          border-left: 1px solid #d1d5db;
          border-right: 1px solid #d1d5db;
          border-top: none;
          border-radius: 0 0 0.375rem 0.375rem;
          font-family: inherit;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
          left: 15px;
          right: 15px;
        }
        .rich-text-editor.error .ql-toolbar {
          border-color: #ef4444;
        }
        .rich-text-editor.error .ql-container {
          border-color: #ef4444;
        }
        .rich-text-editor .ql-picker {
          color: #374151;
        }
        .rich-text-editor .ql-stroke {
          stroke: #374151;
        }
        .rich-text-editor .ql-fill {
          fill: #374151;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;