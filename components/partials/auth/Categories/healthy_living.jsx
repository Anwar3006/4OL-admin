import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import TextinputNew from "@/components/ui/TextinputNew";
import TextareaNew from "@/components/ui/TextareaNew";
import RichTextEditor from "@/components/ui/RichTextEditor";
import Fileinput from "@/components/ui/Fileinput";
import { add_healthy_living } from "@/app/services/healthy_living";
import { updateHealthyLivingEntry } from "@/app/services/healthy-living-service";
import { uploadSingleFileToSupabase } from "@/app/utils/uploadMedia";
import handleSuccess from "@/utils/handleSuccess";

// ✅ Helper function to validate rich text content
const validateRichTextContent = (value) => {
  if (!value) return false;
  // Remove HTML tags and check if there's actual text content
  const textContent = value.replace(/<[^>]*>/g, '').trim();
  return textContent.length > 0;
};

// ✅ Yup validation schema
const schema = yup.object().shape({
  topic_name: yup.string().required("Topic name is required"),
  about: yup
    .string()
    .required("About is required")
    .test("has-content", "About content is required", validateRichTextContent),
  category: yup
    .string()
    .required("Category is required")
    .test("has-content", "Category content is required", validateRichTextContent),
  contact_your_doctor: yup
    .string()
    .required("Contact your doctor is required")
    .test("has-content", "Contact your doctor content is required", validateRichTextContent),
  more_information: yup
    .string()
    .required("More information is required")
    .test("has-content", "More information content is required", validateRichTextContent),
  attribution: yup.string().required("Attribution is required"),
});

// ✅ Field configuration array
const fields = [
  { name: "topic_name", label: "Topic Name", component: TextinputNew, isRichText: false },
  { name: "about", label: "About", component: RichTextEditor, isRichText: true },
  { name: "category", label: "Category", component: RichTextEditor, isRichText: true },
  {
    name: "contact_your_doctor",
    label: "Contact your Doctor",
    placeholder: "Contact your doctor or visit a health facility if",
    component: RichTextEditor,
    isRichText: true,
  },
  { name: "more_information", label: "More Information", component: RichTextEditor, isRichText: true },
  { name: "attribution", label: "Attribution", component: TextinputNew, isRichText: false },
];

export default function HealthyLiving() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("healthyliving");
  const data = itemParam ? JSON.parse(itemParam) : null;

  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  // ✅ useForm with yup schema and defaultValues
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema)
  });

  // ✅ Populate form values when editing
  useEffect(() => {
    if (data) {
      reset({
        topic_name: data.topic_name || "",
        about: data.about || "",
        category: data.category || "",
        contact_your_doctor: data.contact_your_doctor || "",
        more_information: data.more_information || "",
        attribution: data.attribution || "",
      });
      setImageUrl(data.image_url || "");
    }
  }, [data, reset]);

  const onSubmit = async (formData) => {
    try {
      setLoading(true);

      // ✅ Upload image if selected
      let uploadedImageUrl = imageUrl;
      if (imageFile) {
        uploadedImageUrl = await uploadSingleFileToSupabase(imageFile, "healthy-living");
        setImageUrl(uploadedImageUrl);
      }

      // ✅ Generate list_type from first character of topic_name
      const listType = formData.topic_name.charAt(0).toUpperCase();

      const payload = {
        ...formData,
        list_type: listType,
        image_url: uploadedImageUrl || "",
      };

      if (data?.id) {
        await updateHealthyLivingEntry(data.id, payload);
        handleSuccess(router, "Updated Successfully");
        router.push('/categories/healthy_living/overview')
        reset();
      } else {
        add_healthy_living(
          payload,
          () => setLoading(true),
          () => {
            setLoading(false);
            toast.success("Added Successfully");
            router.push('/categories/healthy_living/overview')
            reset();
            setImageFile(null);
            setImageUrl("");
          },
          (error) => {
            setLoading(false);
            toast.error(error.message || "Submission failed");
            console.error("Error:", error);
          }
        );
      }
    } catch (error) {
      toast.error("Something went wrong");
      console.error("Submission Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full grid md:grid-cols-2 grid-cols-1 gap-4 capitalize"
    >
      {fields.map(({ name, label, component: Component, placeholder, isRichText }) => (
        <div key={name}>
          {isRichText ? (
            <Controller
              name={name}
              control={control}
              render={({ field: { onChange, value } }) => (
                <Component
                  name={name}
                  label={label}
                  placeholder={placeholder || " "}
                  value={value || ""}
                  onChange={onChange}
                  error={errors[name]}
                />
              )}
            />
          ) : (
            <Component
              name={name}
              label={label}
              placeholder={placeholder || " "}
              register={register}
              error={errors[name]}
            />
          )}
        </div>
      ))}

      {/* ✅ File Upload */}
      <div>
        <label className="text-sm capitalize block mb-1">Upload Image</label>
        <Fileinput
          name="image"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              setImageFile(file);
              setImageUrl(URL.createObjectURL(file));
            }
          }}
          mediaType="image"
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
        {loading
          ? data?.id
            ? "Updating..."
            : "Submitting..."
          : data?.id
          ? "Update"
          : "Submit"}
      </button>

      <ToastContainer />
    </form>
  );
}
