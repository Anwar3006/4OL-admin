"use client";
import "react-toastify/dist/ReactToastify.css";
import "simplebar-react/dist/simplebar.min.css";
import "flatpickr/dist/themes/light.css";
import "react-svg-map/lib/index.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Provider } from "react-redux";
import store from "../store";
import QueryProvider from "@/components/providers/QueryProvider";

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  return (
    <>
      <html lang="en">
        <body className="font-inter  custom-tippy dashcode-app">
          <QueryProvider>
            <Provider store={store}>{children}</Provider>
          </QueryProvider>
          <Toaster />
        </body>
      </html>
    </>
  );
}
