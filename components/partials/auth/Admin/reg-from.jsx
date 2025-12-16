"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { signup } from "@/app/services/signup";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Textinput from "@/components/ui/Textinput";
import SplitDropdown2 from "@/components/ui/Split-Dropdown2";
import { supabase } from "@/app/utils/supabaseClient";
import { PERMISSION_ITEMS, PRIVILEGE_ITEMS } from "@/constant/permissions";

// Define the schema using yup
const schema = yup.object().shape({
  first_name: yup.string().required("First Name is required"),
  last_name: yup.string().required("Last Name is required"),
  sex: yup
    .string()
    .oneOf(["Male", "Female"], "Sex is required")
    .required("Sex is required"),
  dob: yup.date().required("Date of Birth is required"),
  email: yup.string().email("Email is invalid").required("Email is required"),
  phone_number: yup.string().required("Phone Number is required"),
  role: yup
    .string()
    .oneOf(["Admin", "Super Admin"], "Role is required")
    .required("Role is required"),
  permissions: yup
    .array()
    .of(yup.object())
    .min(1, "Select at least one Permission")
    .required("Permission is required"),
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters long")
    .required("Password is required"),
  confirm_password: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords do not match")
    .required("Confirm Password is required"),
});

const RegForm = () => {
  const [loading, setLoading] = useState(false);
  const [isSuperAdminCreated, setIsSuperAdminCreated] = useState(false);
  const router = useRouter();

  // useForm hook with yupResolver
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch, // To watch form values
  } = useForm({
    resolver: yupResolver(schema),
  });

  const fetchData = async () => {
    try {
      // Query to check if Super Admin exists
      const { data, error } = await supabase
        .from("user_profiles") // Assuming 'users' table contains user roles
        .select("*")
        .eq("role", "Super Admin")
        .limit(1); // Use limit to check if Super Admin exists
      console.log(data);
      if (error) {
        throw error; // If there's an error, throw it to be caught in the catch block
      }

      setIsSuperAdminCreated(data.length > 0); // If data contains any row, Super Admin exists
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedSex = watch("sex"); // Watch the value of 'sex'
  const selectedRole = watch("role"); // Watch the value of 'role'
  const selectedPermissions = watch("permissions") || [];
  const dropdownItems = PERMISSION_ITEMS.map((item) => ({
    ...item,
    selected: selectedPermissions.includes(item.resource),
  }));

  const onSubmit = (user) => {
    console.log("Called");
    setLoading(true);

    const updatedUser = {
      ...user,
      email: user.email.trim().toLowerCase(),
      role: user.role || "Admin",
      phone_number: user.phone_number || "default_value",
    };

    console.log(updatedUser);
    setLoading(false);

    signup(
      updatedUser,
      () => setLoading(true),
      (successData) => {
        setLoading(false);
        toast.success("User registered successfully");
        router.push("/admin"); // Redirect to admin dashboard or another page
        if (updatedUser.role === "Super Admin") {
          setIsSuperAdminCreated(true); // Mark Super Admin as created after successful submission
        }
      },
      (error) => {
        setLoading(false);
        toast.error(error.message);
        console.error("Error:", error);
      }
    );
  };

  return (
    <form
      className="w-full grid grid-cols-1 lg:grid-cols-2 sm:gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Textinput
        name="first_name"
        label="First Name"
        type="text"
        placeholder="First Name"
        register={register}
        error={errors.first_name?.message}
        className="mb-2 capitalize"
      />

      <Textinput
        name="last_name"
        label="Last Name"
        type="text"
        placeholder="Last Name"
        register={register}
        error={errors.last_name?.message}
        className="mb-2 capitalize"
      />

      <SplitDropdown2
        label="Sex"
        value={selectedSex}
        onChange={(value) => setValue("sex", value)}
        className="mb-4 w-full"
        inputClass="hidden capitalize"
      />

      <Textinput
        name="dob"
        label="Date of Birth"
        type="date"
        placeholder="Date of Birth"
        register={register}
        error={errors.dob?.message}
        className="mb-2"
      />

      <Textinput
        name="email"
        label="Email"
        type="email"
        placeholder="Enter your email"
        register={register}
        error={errors.email?.message}
        className="mb-2"
      />

      <Textinput
        name="phone_number"
        label="Phone Number"
        type="tel"
        placeholder="Enter your phone number"
        register={register}
        error={errors.phone_number?.message}
        className="mb-2"
      />

      <SplitDropdown2
        label="Role"
        value={selectedRole}
        items={
          isSuperAdminCreated
            ? [{ label: "Admin" }]
            : [{ label: "Super Admin" }, { label: "Admin" }]
        }
        onChange={(value) => setValue("role", value)}
        className="mb-4 w-full"
        inputClass="hidden capitalize"
      />

      {/* Modify it to Permissions/Privilegdes */}
      <SplitDropdown2
        label="Permissions"
        value={selectedPermissions}
        items={dropdownItems}
        onChange={(value) => setValue("permissions", value)}
        isMultiSelect={true}
        multiColumn={true}
        className="mb-4 w-full"
        inputClass="hidden capitalize"
        error={errors.permissions?.message}
      />

      {/* Password and Confirm Password in one column */}
      <div className="col-span-full lg:col-span-1">
        <Textinput
          name="password"
          label="Password"
          type="password"
          placeholder="Password"
          register={register}
          error={errors.password?.message}
          className="mb-2"
          hasicon={true}
        />

        <Textinput
          name="confirm_password"
          label="Confirm Password"
          type="password"
          placeholder="Confirm Password"
          register={register}
          error={errors.confirm_password?.message}
          className="mb-5"
          classLabel="mt-5 mb-2"
          hasicon={true}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full"
      >
        {loading ? "Signing Up..." : "Sign Up"}
      </button>
    </form>
  );
};

export default RegForm;
