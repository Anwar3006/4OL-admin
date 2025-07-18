"use client";
import React, { useState, useRef } from "react";
import Link from "next/link";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import { supabase } from "@/app/utils/supabaseClient";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import useDarkMode from "@/hooks/useDarkMode";
import deleteAccount from "@/services/deleteAccount";
import Card from "@/components/ui/Card";

// Validation schema
const schema = yup
  .object({
    email: yup.string().email("Invalid email").required("Email is Required"),
    password: yup.string().required("Password is Required"),
  })
  .required();

export default function DeleteAccountPage() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false); // New state for checkbox
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [isDark] = useDarkMode();

  const {
    register,
    formState: { errors },
    handleSubmit,
    getValues,
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  const { ref: emailHookRef, ...emailRest } = register("email");
  const { ref: passwordHookRef, ...passwordRest } = register("password");

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      console.log("User data:", user);

      if (userError || !user?.email) {
        toast.error("You must be logged in to delete your account");
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        toast.error("Invalid Credentials. Please Verify User  Credentials.");
        return;
      }
      // Open confirmation modal before proceeding with deletion
      setShowModal(true);
    } catch (error) {
      console.log("Password verification failed:", error);
      toast.error("An unexpected error occur. Please try again.");
    }
  };

  // Handle actual account deletion after confirmation
  const handleDeleteAccount = async () => {
    // Only proceed if checkbox is checked
    if (!confirmDelete) {
      toast.error("Please confirm you understand the consequences", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const { email, password } = getValues();
      // First authenticate the user
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        toast.error(
          "Invalid credentials. Please verify your email and password.",
          {
            position: "top-right",
            autoClose: 3000,
          }
        );
        setLoading(false);
        return;
      }
      const { data: session } = await supabase.auth.getUser();

      // Call the database function to delete all user data
      const { error: deleteError } = await supabase.rpc(
        "delete_user_and_related_data",
        { p_user_id: session.user.id }
      );

      if (deleteError) {
        console.error("Delete error:", deleteError);
        toast.error(`Failed to delete account: ${deleteError.message}`, {
          position: "top-right",
          autoClose: 3000,
        });
        setLoading(false);
        setShowModal(false);
        return;
      }

      const deleteEdgeFunction = await deleteAccount(session.user.id);
      console.log(deleteEdgeFunction);

      // if (edgeError) {
      //   console.error("Delete error:", edgeError);
      //   toast.error(`Failed to delete account: ${edgeError.message}`, {
      //     position: "top-right",
      //     autoClose: 3000,
      //   });
      //   setLoading(false);
      //   setShowModal(false);
      //   return;
      // }

      // Sign out the user since their account has been deleted

      toast.success("Account successfully deleted", {
        position: "top-right",
        autoClose: 2000,
      });

      // Reset form and close modal
      reset();
      setShowModal(false);
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error("An unexpected error occurred. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this when modal closes to reset the checkbox
  const closeModal = () => {
    setShowModal(false);
    setConfirmDelete(false); // Reset checkbox when modal closes
  };

  return (
    <>
      <Card
        className="mt-5 bg-white dark:bg-slate-800"
        title={"Danger Zone"}
        subtitle={"Irreversible and destructive actions"}
        titleClass="text-red-600 font-bold"
      >
        <ToastContainer />
        <div className="w-full">
          <div className="w-full">
            <h1 className="text-base font-semibold text-gray-700">
              Delete Account
            </h1>
            <p className="text-sm mt-1">
              Please enter your password to proceed with permanently deleting
              your account.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 lg:w-1/3 w-full mt-5">
            <Textinput
              name="email"
              label="Email"
              type="email"
              placeholder="Enter your email"
              ref={(e) => {
                emailHookRef(e);
                emailRef.current = e;
              }}
              {...emailRest}
              register={register}
              error={errors?.email}
              classLabel=" after:ml-0.5 after:text-red-500 after:content-['*'] text-sm"
              autoComplete="username"
              className="w-full"
            />
            <Textinput
              name="password"
              type="password"
              label={"Password"}
              placeholder="Enter Your Password"
              ref={(e) => {
                passwordHookRef(e);
                passwordRef.current = e;
              }}
              {...passwordRest}
              register={register}
              error={errors?.password}
              hasicon={true}
              classLabel=" after:ml-0.5 after:text-red-500 after:content-['*'] text-sm"
              autoComplete="current-password"
              className="w-full border"
            />

            <button
              type="submit"
              className="btn rounded-md bg-red-500 hover:bg-red-600 text-white  text-center transition-colors"
            >
              Delete Account
            </button>
          </form>
        </div>
      </Card>

      {/* Updated Confirmation Modal */}
      <Modal
        activeModal={showModal}
        onClose={closeModal}
        title="Confirm Account Deletion"
        centered
        className="max-w-md"
        themeClass="bg-red-500 dark:bg-red-600"
        footerContent={
          <>
            <Button
              text="Cancel"
              className="bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 w-full"
              onClick={closeModal}
            />
            <Button
              text={loading ? "Deleting..." : "Delete"}
              className="bg-red-500 text-white hover:bg-red-600 w-full"
              onClick={handleDeleteAccount}
              disabled={loading || !confirmDelete} // Disable button if checkbox isn't checked
            />
          </>
        }
      >
        <div className="space-y-4 py-3">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <p className="text-center text-slate-700 dark:text-slate-300">
            Are you absolutely sure you want to delete your account? This action
            is <span className="font-bold">permanent</span> and cannot be
            undone.
          </p>
          <p className="text-center text-slate-600 dark:text-slate-400 text-sm">
            All your data, including personal information, activity history,
            notifications, medication reminders, period tracker will be
            permanently removed from our system.
          </p>

          {/* Consent Checkbox */}
          <div className="mt-4 flex items-center justify-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-red-500 rounded border-gray-300 focus:ring-red-500"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
              />
              <span className="ml-2 text-slate-700 dark:text-slate-300">
                I understand, delete all my data
              </span>
            </label>
          </div>
        </div>
      </Modal>
    </>
  );
}
