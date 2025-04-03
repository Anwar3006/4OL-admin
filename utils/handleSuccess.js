import { toast } from "react-toastify";

const handleSuccess = (router, message) => {
  toast.success(message);
  setTimeout(() => {
    router.back(); // ✅ Navigate back
  }, 1000);
};

export default handleSuccess;
