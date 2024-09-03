import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import { add_healthy_living } from "@/app/services/healthy_living";

export default function HealthyLiving() {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm();

  const onSubmit = (data) => {
    // Automatically generate list_type based on the first character of the name
    const listType = data.topic_name.charAt(0).toUpperCase();
    
    const newData = {
      ...data,
      list_type: listType, // Add the generated list_type to the data object
    };

    setLoading(true);

    add_healthy_living(
      newData,
      () => {
        setLoading(true);
      },
      (successData) => {
        setLoading(false);
        toast.success("Added Successfully");
        reset(); // Reset form fields after successful submission
      },
      (error) => {
        setLoading(false);
        toast.error(error.message);
        console.error("Error:", error);
      }
    );
  };

  return (
    <form className="w-full grid md:grid-cols-2 grid-cols-1 gap-4 capitalize" onSubmit={handleSubmit(onSubmit)}>
      <Textinput name="topic_name" label="Topic Name" type="text" placeholder=" " register={register} />
      <Textarea name="about" label="About" placeholder=" " register={register} />
      <Textarea name="category" label="Category" type="text" placeholder=" " register={register} />
      <Textarea name="contact_your_doctor" label="Contact your Doctor" placeholder="Contact your Doctor or visit a health facility if" register={register} className="capitalize"/>
      <Textarea name="more_information" label="More Information" placeholder=" " register={register} />
      <Textinput name="attribution" label="Attribution" type="text" placeholder=" " register={register} />

      <button type="submit" className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full mt-5">
        {loading ? "Submitting..." : "Submit"}
      </button>

      <ToastContainer />
    </form>
  );
}
