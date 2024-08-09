import React, { useState } from "react";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import Checkbox from "@/components/ui/Checkbox";
import Link from "next/link";
import { useSelector, useDispatch } from "react-redux";
import { handleLogin } from "./store";
import { toast } from "react-toastify";
const schema = yup
  .object({
    email: yup.string().email("Invalid email").required("Email is Required"),
    password: yup.string().required("Password is Required"),
  })
  .required();
const LoginForm = () => {
  const dispatch = useDispatch();
  const { users } = useSelector((state) => state.auth);
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
    //
    mode: "all",
  });
  const router = useRouter();
  const onSubmit = (data) => {
    const user = users.find(
      (user) => user.email === data.email && user.password === data.password
    );
    console.log(user)
    if (user) {
      dispatch(handleLogin(true));
      setTimeout(() => {
        router.push("/analytics");
      }, 1500);
    } else {
      toast.error("Invalid credentials", {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
  };

  const [checked, setChecked] = useState(false);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
      <Textinput
        name="email"
        label="email"
        defaultValue="4OurLife@gmail.com"
        type="email"
        placeholder="Enter your email"
        register={register}
        error={errors?.email}
      />
      <Textinput
        name="password"
        label="passwrod"
        type="password"
        defaultValue="4OurLife12?"
        icon={'eye'}
        placeholder="Enter Your password"
        
        register={register}
        error={errors.password}
      />
      <div className="flex justify-between">
        <Checkbox
          value={checked}
          onChange={() => setChecked(!checked)}
          label="Keep me signed in"
        />
        <Link
          href="/forgot-password2"
          className="text-sm text-slate-800 dark:text-slate-400 leading-6 font-medium"
        >
          Forgot Password?{" "}
        </Link>
      </div>

      <button className="btn bg-[#56ce84] text-white block w-full text-center">Sign in</button>
    </form>
  );
};

export default LoginForm;
