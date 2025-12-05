import React, { useState } from "react";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";

const schema = yup
  .object({
    name: yup.string().required("Name is required"),
    email: yup.string().email("Invalid email").required("Email is required"),
    message: yup.string().required("Message is required").min(10, "Message must be at least 10 characters"),
  })
  .required();

const SupportForm = () => {
  const [loading, setLoading] = useState(false);
  const { register, formState: { errors }, handleSubmit, reset } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Message sent successfully! We'll get back to you soon.");
        reset(); // Reset form after successful submission
      } else {
        toast.error(result.error || "Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Textinput
        name="name"
        label="Name"
        type="text"
        placeholder="Enter your name"
        register={register}
        error={errors.name}
        required
      />
      <Textinput
        name="email"
        label="Email"
        type="email"
        placeholder="Enter your email"
        register={register}
        error={errors.email}
        required
      />
      <Textarea
        name="message"
        label="Message"
        placeholder="Enter your message"
        register={register}
        error={errors.message}
        row={5}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="btn bg-[#56ce84] text-white block w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Sending..." : "Submit"}
      </button>
    </form>
  );
};

export default SupportForm;

