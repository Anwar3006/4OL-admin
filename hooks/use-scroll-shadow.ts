import { useEffect, useState, useRef } from "react";

export function useScrollShadow() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      setShowLeftShadow(scrollLeft > 0);
      setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
    };

    checkScroll();
    element.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      element.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  return { scrollRef, showLeftShadow, showRightShadow };
}
