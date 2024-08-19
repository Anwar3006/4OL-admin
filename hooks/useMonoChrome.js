import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { handleMonochrome } from "@/store/layoutReducer";

const useMonoChrome = () => {
  const dispatch = useDispatch();
  const isMonoChrome = useSelector((state) => state.layout.isMonochrome);

  const setMonoChrome = (val) => {
    dispatch(handleMonochrome(val));
    localStorage.setItem("monochrome", JSON.stringify(val));
  };

  useEffect(() => {
    const storedMode = localStorage.getItem("monochrome");
    if (storedMode !== null) {
      dispatch(handleMonochrome(JSON.parse(storedMode)));
    }
  }, []);

  return [isMonoChrome, setMonoChrome];
};

export default useMonoChrome;
