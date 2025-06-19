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
import Fileinput from "@/components/ui/Fileinput";
import { uploadSingleFileToSupabase } from "@/app/utils/uploadMedia";

export default function HealthyLiving() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("healthyliving");
  const data = itemParam ? JSON.parse(itemParam) : null;
  const router = useRouter();
  const [imageFile, setImageFile] = useState(null); // raw file
  const [imageUrl, setImageUrl] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (formData) => {
    let imageUrl = "";

    if (imageFile) {
      imageUrl = await uploadSingleFileToSupabase(imageFile, "healthy-living");
      setImageUrl(imageUrl); // ← optional, for preview if needed after submit
    }
    // Automatically generate list_type based on the first character of the name
    const listType = formData.topic_name.charAt(0).toUpperCase();

    const newData = {
      ...formData,
      list_type: listType,
      image_url: imageUrl || data?.image_url || "",
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
          reset();
          setImageFile(null);
          setImageUrl("");
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

      <div>
        <label
          htmlFor={"upload image"}
          className={`text-sm capitalize flex-0 mr-6 md:w-[100px] w-[60px] break-words`}
        >
          Upload Image
        </label>
        <Fileinput
          name="image"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              setImageFile(file);
              setImageUrl(URL.createObjectURL(file)); // <-- Show preview
            }
          }}
          multiple={false}
          placeholder="Upload Image"
          mediaType="image"
          className="my-2"
          accept="image/*"
        />
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Preview"
            className="w-32 h-32 object-cover rounded mt-2 border"
          />
        )}
      </div>

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
