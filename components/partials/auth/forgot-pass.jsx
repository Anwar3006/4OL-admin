import React from "react";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import { sendOtpToEmail } from "@/app/services/login";
import { useRouter } from "next/navigation";

const schema = yup
  .object({
    email: yup.string().email("Invalid email").required("Email is Required"),
  })
  .required();

const ForgotPass = () => {
  const router = useRouter();
  const { register, formState: { errors }, handleSubmit } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    const { email } = data;
    try {
      await sendOtpToEmail(
        email,
        () => console.log("Loading..."),
        () => {
          localStorage.setItem('email', email); // Store email in localStorage
          router.push('/verify-otp'); // Redirect to OTP verification page
        },
        (error) => console.error("Error:", error)
      );
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Textinput
        name="email"
        label="Email"
        type="email"
        placeholder="Enter your email"
        register={register}
        error={errors.email}
      />
      <button className="btn bg-[#56ce84] text-white block w-full text-center">
        Send OTP To Email
      </button>
    </form>
  );
};

export default ForgotPass;
