import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import Textinput from "@/components/ui/Textinput";
import { supabase } from "@/app/utils/supabaseClient";
import { decryptPassword, encryptPassword } from "@/app/utils/helpers";

// Validation Schema
const schema = yup.object().shape({
    old_password: yup.string().required("Old Password is required"),
    new_password: yup
      .string()
      .min(8, "Password must be at least 8 characters")
      .matches(/[A-Za-z]/, "Password must contain at least one letter")
      .matches(/\d/, "Password must contain at least one number")
      .matches(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
      .required("New Password is required"),
    confirm_password: yup
      .string()
      .oneOf([yup.ref("new_password"), null], "Passwords must match")
      .required("Confirm Password is required"),
  });
  

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (formData) => {
    setLoading(true);

    try {
      // Fetch the current user data
      const { data: user, error: fetchError } = await supabase
        .from("user_profiles")
        .select("password")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw new Error("Failed to fetch user data");
      }

      // Decrypt stored password and compare
      const decryptedOldPassword = decryptPassword(user.password);

      if (formData.old_password !== decryptedOldPassword) {
        throw new Error("Old Password is incorrect");
      }

      // Encrypt the new password
      const encryptedNewPassword = encryptPassword(formData.new_password);

      // Update the user's password
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ password: encryptedNewPassword })
        .eq("id", id);

      if (updateError) {
        throw new Error("Failed to update the password");
      }

      toast.success("Password updated successfully");
      router.push("/admin");
    } catch (error) {
      console.error("Error updating password:", error.message);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!id) return <p>Loading...</p>;

  return (
    <form
      className="w-full grid grid-cols-1 lg:grid-cols-2 sm:gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Textinput
        name="old_password"
        label="Old Password *"
        type="password"
        placeholder="Old Password"
        register={register}
        error={errors.old_password?.message}
        className="mb-2"
        hasicon={true}
      />

      <Textinput
        name="new_password"
        label="New Password *"
        type="password"
        placeholder="New Password"
        register={register}
        error={errors.new_password?.message}
        className="mb-2"
        hasicon={true}
      />

      <Textinput
        name="confirm_password"
        label="Confirm Password *"
        type="password"
        placeholder="Confirm Password"
        register={register}
        error={errors.confirm_password?.message}
        className="mb-2"
        hasicon={true}
      />

      <button
        type="submit"
        disabled={loading}
        className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full"
      >
        {loading ? "Updating..." : "Update"}
      </button>
      <ToastContainer />
    </form>
  );
};

export default ResetPassword;
