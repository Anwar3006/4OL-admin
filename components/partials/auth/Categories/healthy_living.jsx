import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import TextinputNew from "@/components/ui/TextinputNew";
import TextareaNew from "@/components/ui/TextareaNew";
import { add_healthy_living } from "@/app/services/healthy_living";
import { useSearchParams } from "next/navigation";
import { updateHealthyLivingEntry } from "@/app/services/healthy-living-service";
import handleSuccess from "@/utils/handleSuccess";
import { useRouter } from "next/navigation";

export default function HealthyLiving() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("healthyliving");
  const data = itemParam ? JSON.parse(itemParam) : null;
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (formData) => {
    // Automatically generate list_type based on the first character of the name
    const listType = formData.topic_name.charAt(0).toUpperCase();

    const newData = {
      ...formData,
      list_type: listType, // Add the generated list_type to the data object
    };

    if (data?.id) {
      await updateHealthyLivingEntry(data?.id, newData);
      handleSuccess(router, "Updated Successfully");
      reset();
    } else {
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
    }
  };

  return (
    <form
      className="w-full grid md:grid-cols-2 grid-cols-1 gap-4 capitalize"
      onSubmit={handleSubmit(onSubmit)}
    >
      <TextinputNew
        name="topic_name"
        label="Topic Name"
        type="text"
        placeholder=" "
        register={register}
        defaultValue={data?.topic_name || ""}
      />
      <TextareaNew
        name="about"
        label="About"
        placeholder=" "
        register={register}
        defaultValue={data?.about || ""}
      />
      <TextareaNew
        name="category"
        label="Category"
        type="text"
        placeholder=" "
        register={register}
        defaultValue={data?.category}
      />
      <TextareaNew
        name="contact_your_doctor"
        label="Contact your Doctor"
        placeholder="Contact your Doctor or visit a health facility if"
        register={register}
        className="capitalize"
        defaultValue={data?.contact_your_doctor}
      />
      <TextareaNew
        name="more_information"
        label="More Information"
        placeholder=" "
        register={register}
        defaultValue={data?.more_information}
      />
      <TextinputNew
        name="attribution"
        label="Attribution"
        type="text"
        placeholder=" "
        register={register}
        defaultValue={data?.attribution}
      />

      <button
        type="submit"
        className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full mt-5"
      >
        {data?.id
          ? loading
            ? "Updating..."
            : "Update"
          : loading
          ? "Submitting..."
          : "Submit"}
      </button>

      <ToastContainer />
    </form>
  );
}
