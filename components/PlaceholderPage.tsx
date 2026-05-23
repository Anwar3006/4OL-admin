import React from "react";

const PlaceholderPage = ({ title, description }: { title: string; description: string }) => {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 p-8 text-center">
      <div className="rounded-full bg-emerald-50 p-6">
        <div className="h-12 w-12 rounded-full border-4 border-emerald-100 border-t-[#2cc295] animate-spin" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[#131927]" style={{ fontFamily: "var(--font-syne)" }}>
        {title}
      </h1>
      <p className="max-w-md text-slate-500 leading-relaxed">
        {description}
      </p>
      <div className="mt-8 flex gap-3">
        <div className="h-2 w-2 rounded-full bg-[#2cc295] animate-bounce" />
        <div className="h-2 w-2 rounded-full bg-[#2cc295] animate-bounce [animation-delay:0.2s]" />
        <div className="h-2 w-2 rounded-full bg-[#2cc295] animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  );
};

export default PlaceholderPage;
