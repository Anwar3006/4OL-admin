import React, { useState } from "react";
import Textinput from "@/components/ui/Textinput";

interface GlobalFilterProps {
  filter: string;
  setFilter: (val: string) => void;
  placeholder?: string;
}

const GlobalFilter = ({ filter, setFilter, placeholder = "🔍︎ Search..." }: GlobalFilterProps) => {
  const [value, setValue] = useState(filter);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setFilter(e.target.value);
  };
  return (
    <div>
                    {/* @ts-ignore: Textinput is a .jsx component and incorrectly infers optional props as required */}
                    <Textinput
                      label=""
                      type="text"
                      value={value}
                      onChange={onChange}
                      placeholder={placeholder}
                    />
    </div>
  );
};

export default GlobalFilter;
