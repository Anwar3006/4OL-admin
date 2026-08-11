"use client";
import "react-toastify/dist/ReactToastify.css";
import "flatpickr/dist/themes/light.css";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  return (
    <>
      <html lang="en">
        <body className="font-inter  custom-tippy dashcode-app">
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </body>
      </html>
    </>
  );
}
