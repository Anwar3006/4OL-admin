import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";
import TextinputNew from "@/components/ui/TextinputNew";
import RichTextEditor from "@/components/ui/RichTextEditor";
import Fileinput from "@/components/ui/Fileinput";
import { add_healthy_living } from "@/app/services/healthy_living";
import {
  getHealthyLivingEntryById,
  updateHealthyLivingEntry,
} from "@/app/services/healthy-living-service";
import { uploadSingleFileToSupabase } from "@/app/utils/uploadMedia";
import handleSuccess from "@/utils/handleSuccess";

// ✅ Helper function to validate rich text content
const validateRichTextContent = (value) => {
  if (!value) return false;
  // Remove HTML tags and check if there's actual text content
  const textContent = value.replace(/<[^>]*>/g, "").trim();
  return textContent.length > 0;
};

// ✅ Yup validation schema
const schema = yup.object().shape({
  topic_name: yup.string().nullable(),
  about: yup.string().nullable(),
  types: yup.array().of(
    yup.object().shape({
      type_name: yup.string(),
      about_type: yup.string(),
    })
  ),
  category: yup.string().nullable(),
  contact_your_doctor: yup.string().nullable(),
  more_information: yup.string().nullable(),
  attribution: yup.string().nullable(),
});

// ✅ Field configuration array - split into top and bottom sections for ordered visual rendering
const topFields = [
  {
    name: "topic_name",
    label: "Topic Name",
    component: TextinputNew,
    isRichText: false,
  },
  {
    name: "about",
    label: "About",
    component: RichTextEditor,
    isRichText: true,
  },
];

const bottomFields = [
  {
    name: "category",
    label: "Category",
    component: RichTextEditor,
    isRichText: true,
  },
  {
    name: "contact_your_doctor",
    label: "Contact your Doctor",
    placeholder: "Contact your doctor or visit a health facility if",
    component: RichTextEditor,
    isRichText: true,
  },
  {
    name: "more_information",
    label: "More Information",
    component: RichTextEditor,
    isRichText: true,
  },
  {
    name: "attribution",
    label: "Attribution",
    component: RichTextEditor,
    isRichText: true,
  },
];

export default function HealthyLiving() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("healthyliving");
  const data = itemParam ? JSON.parse(itemParam) : null;
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const id = searchParams.get("id");
  const [healthyLiving, setHealthyLiving] = useState(null);
  //Added to enable adding, editing and deleting of types
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempType, setTempType] = useState({
    type_name: "",
    about_type: "",
  });

  useEffect(() => {
    if (id) {
      getHealthyLivingEntryById(id).then((data) => {
        setHealthyLiving(data);
      });
    }
  }, [id]);

  // ✅ useForm with yup schema and defaultValues
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      types: [],
    },
  });

  // ✅ Populate form values when editing
  useEffect(() => {
    if (healthyLiving) {
      reset({
        topic_name: healthyLiving.topic_name || "",
        about: healthyLiving.about || "",
        types: healthyLiving.types || [],
        category: healthyLiving.category || "",
        contact_your_doctor: healthyLiving.contact_your_doctor || "",
        more_information: healthyLiving.more_information || "",
        attribution: healthyLiving.attribution || "",
      });
      setImageUrl(healthyLiving.image_url || "");
    }
  }, [healthyLiving, reset]);

  // To handle the Types Array input -> [{type_name1, about_type1}, ...]
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "types",
  });

  const onSubmit = async (formData) => {
    try {
      setLoading(true);

      // console.log("Form Data: ", formData);
      // return;

      // ✅ Upload image if selected
      let uploadedImageUrl = imageUrl;
      if (imageFile) {
        uploadedImageUrl = await uploadSingleFileToSupabase(
          imageFile,
          "healthy-living"
        );
        setImageUrl(uploadedImageUrl);
      }

      // ✅ Generate list_type from first character of topic_name
      const listType = formData.topic_name.charAt(0).toUpperCase();

      const payload = {
        ...formData,
        list_type: listType,
        image_url: uploadedImageUrl || healthyLiving?.image_url || "",
      };

      if (healthyLiving?.id) {
        await updateHealthyLivingEntry(healthyLiving.id, payload);
        handleSuccess(router, "Updated Successfully");
        router.push("/categories/healthy_living/overview");
        reset();
      } else {
        add_healthy_living(
          payload,
          () => setLoading(true),
          () => {
            setLoading(false);
            toast.success("Added Successfully");
            router.push("/categories/healthy_living/overview");
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
      {/* Top Section */}
      {topFields.map(
        ({ name, label, component: Component, placeholder, isRichText }) => (
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
        )
      )}

      {/* Types Section */}
      <div className="col-span-full bg-gray-50 border rounded-lg p-5">
        <h3 className="font-semibold text-lg mb-4">Types</h3>

        {/* ✅ LIST OF ADDED TYPES */}
        {fields.length > 0 && (
          <div className="mb-4 space-y-2">
            {fields.map((item, index) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-white p-3 rounded border"
              >
                <div>
                  <p className="font-medium text-sm">{item.type_name}</p>
                </div>

                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    className="text-blue-600"
                    onClick={() => {
                      setEditingIndex(index);
                      setTempType(item);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => remove(index)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ✅ TYPE EDITOR FORM */}
        <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
          <TextinputNew
            name="temp_type_name"
            label="Type Name"
            value={tempType.type_name}
            onChange={(e) =>
              setTempType({ ...tempType, type_name: e.target.value })
            }
          />

          <RichTextEditor
            name="temp_about_type"
            label="About Type"
            value={tempType.about_type}
            onChange={(value) =>
              setTempType({ ...tempType, about_type: value })
            }
          />
        </div>

        {/* ✅ ACTION BUTTONS */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="bg-[#56ce84] text-white px-4 py-2 rounded text-sm"
            onClick={() => {
              if (editingIndex) {
                update(editingIndex, tempType);
                setEditingIndex(null);
              } else {
                if (tempType.type_name.trim() === "") return;
                append(tempType);
              }

              setTempType({ type_name: "", about_type: "" });
            }}
          >
            {editingIndex ? "Update Type" : "+ Add Type"}
          </button>

          {editingIndex && (
            <button
              type="button"
              className="bg-gray-400 text-white px-4 py-2 rounded text-sm"
              onClick={() => {
                setEditingIndex(null);
                setTempType({ type_name: "", about_type: "" });
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {errors?.types && (
          <p className="text-sm text-red-500 mt-2">
            At least one type is required
          </p>
        )}
      </div>

      {/* Bottom Section */}
      {bottomFields.map(
        ({ name, label, component: Component, placeholder, isRichText }) => (
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
        )
      )}

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
        {(imageUrl || healthyLiving?.image_url) && (
          <img
            src={imageUrl || healthyLiving?.image_url}
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
