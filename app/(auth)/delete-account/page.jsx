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
  const onSubmit = (data) => {
    // Open confirmation modal before proceeding with deletion
    setShowModal(true);
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
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative">
            <div className="inner-content h-full flex flex-col bg-white dark:bg-slate-800">
              <div className="auth-box h-full flex flex-col justify-center">
                <div className="mobile-logo text-center mb-6 lg:hidden block w-10 mx-auto">
                  <Link href="/">
                    <img
                      src={
                        isDark
                          ? "assets/images/all-img/logo-green.png"
                          : "/assets/images/all-img/logo-green.png"
                      }
                      alt=""
                      className="mx-auto"
                    />
                  </Link>
                </div>
                <div className="text-center 2xl:mb-10 mb-4">
                  <h4 className="font-medium">Delete Account</h4>
                  <div className="text-red-500 text-base">
                    This action is permanent and cannot be undone.
                  </div>
                </div>

                <ToastContainer />
                <div className="md:max-w-[345px] w-full mx-auto">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                      autoComplete="username"
                      className="w-full"
                    />
                    <Textinput
                      name="password"
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      ref={(e) => {
                        passwordHookRef(e);
                        passwordRef.current = e;
                      }}
                      {...passwordRest}
                      register={register}
                      error={errors?.password}
                      hasicon={true}
                      autoComplete="current-password"
                      className="w-full"
                    />

                    <button
                      type="submit"
                      className="btn bg-red-500 hover:bg-red-600 text-white block w-full text-center transition-colors"
                    >
                      Delete Account
                    </button>
                  </form>
                </div>
              </div>
              <div className="auth-footer text-center">
                Copyright 2024, 4-Our Life All Rights Reserved.
              </div>
            </div>
          </div>

          {/* left side with background image */}
          <div
            className="left-column bg-cover bg-no-repeat bg-center"
            style={{
              backgroundImage: `url('/assets/images/all-img/4 Our Life.png')`,
              height: "100vh",
            }}
          >
            <div className="flex flex-col h-full justify-center">
              <div className="flex-1 flex flex-col justify-center items-center">
                <Link href="/">{/* Logo can be added here if needed */}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

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
