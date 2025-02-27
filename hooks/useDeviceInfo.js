import { useState, useEffect } from "react";
import { UAParser } from "ua-parser-js";

export default function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState({
    loaded: false,
    isMobile: false,
    deviceName: "Unknown",
    deviceModel: "Unknown",
    deviceVendor: "Unknown",
    os: "Unknown",
    osVersion: "Unknown",
    browser: "Unknown",
    browserVersion: "Unknown",
    userAgent: "",
  });

  useEffect(() => {
    // Only run on client-side
    if (typeof window === "undefined") return;

    const userAgent = navigator.userAgent;
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Check if device is mobile
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      ) ||
      result.device.type === "mobile" ||
      result.device.type === "tablet";

    // Get device details
    const deviceModel = result.device.model || "Unknown Model";
    const deviceVendor = result.device.vendor || "Unknown Vendor";

    // Create a friendly device name
    let deviceName = "Unknown Device";
    if (deviceVendor !== "Unknown Vendor" && deviceModel !== "Unknown Model") {
      deviceName = `${deviceVendor} ${deviceModel}`;
    } else if (result.os.name) {
      // Fallback to OS name if device details aren't available
      deviceName = result.os.name + (isMobile ? " Mobile Device" : " Desktop");
    }

    setDeviceInfo({
      loaded: true,
      isMobile,
      deviceName,
      deviceModel: deviceModel,
      deviceVendor: deviceVendor,
      os: result.os.name || "Unknown",
      osVersion: result.os.version || "Unknown",
      browser: result.browser.name || "Unknown",
      browserVersion: result.browser.version || "Unknown",
      userAgent,
    });
  }, []);

  return deviceInfo;
}
