import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import TextinputNew from "@/components/ui/TextinputNew";
import RichTextEditor from "@/components/ui/RichTextEditor";
import Button from "@/components/ui/Button";
import { Icon } from "@iconify/react";
import { add_symptoms } from "@/app/services/symptoms";
import { useSearchParams } from "next/navigation";
import { getSymptomById, updateSymptom } from "@/app/services/symptoms-service";
import handleSuccess from "@/utils/handleSuccess";
import { useRouter } from "next/navigation";
import Fileinput from "@/components/ui/Fileinput";
import { uploadSingleFileToSupabase } from "@/app/utils/uploadMedia";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

export default function SymptomsForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("symptom");
  const id = searchParams.get("id");
  const [symptoms, setSymptoms] = useState(null);
  const router = useRouter();
  const [imageFile, setImageFile] = useState(null); // raw file
  const [imageUrl, setImageUrl] = useState("");

  // ✅ Helper function to validate rich text content
  const validateRichTextContent = (value) => {
    if (!value) return false;
    // Remove HTML tags and check if there's actual text content
    const textContent = value.replace(/<[^>]*>/g, "").trim();
    return textContent.length > 0;
  };
  const schema = yup.object().shape({
    symptom_name: yup.string().required("Symptom name is required"),
    about: yup
      .string()
      .required("About is required")
      .test(
        "has-content",
        "About content is required",
        validateRichTextContent
      ),
    diagnosis: yup
      .string()
      .required("Diagnosis is required")
      .test(
        "has-content",
        "Diagnosis content is required",
        validateRichTextContent
      ),
    treating: yup
      .string()
      .required("Treating is required")
      .test(
        "has-content",
        "Treating content is required",
        validateRichTextContent
      ),
    complications: yup
      .string()
      .required("Complications is required")
      .test(
        "has-content",
        "Complications content is required",
        validateRichTextContent
      ),
    prevention: yup
      .string()
      .required("Prevention is required")
      .test(
        "has-content",
        "Prevention content is required",
        validateRichTextContent
      ),
    specialist_to_contact: yup
      .string()
      .required("Specialist(s) to contact is required"),
    contact_your_doctor: yup
      .string()
      .required("Contact your doctor is required")
      .test(
        "has-content",
        "Contact your doctor content is required",
        validateRichTextContent
      ),
    more_information: yup
      .string()
      .required("More information is required")
      .test(
        "has-content",
        "More information content is required",
        validateRichTextContent
      ),
    attribution: yup.string().required("Attribution is required"),
    types: yup
      .array()
      .of(
        yup.object().shape({
          type_name: yup.string().required("Type name is required"),
          about_type: yup.string().required("About this type is required"),
        })
      )
      .min(1, "At least one type is required"),

    causes: yup
      .array()
      .of(
        yup.object().shape({
          cause_name: yup.string().required("Cause name is required"),
          other_possible_causes: yup
            .string()
            .required("Other causes are required"),
        })
      )
      .min(1, "At least one cause is required"),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      symptom_name: "",
      about: "",
      diagnosis: "",
      treating: "",
      complications: "",
      prevention: "",
      specialist_to_contact: "",
      contact_your_doctor: "",
      more_information: "",
      attribution: "",
      types: [{ type_name: "", about_type: "" }],
      causes: [{ cause_name: "", other_possible_causes: "" }],
    },
  });

  // For dynamic Types
  const {
    fields: typeFields,
    append: appendType,
    remove: removeType,
  } = useFieldArray({
    control,
    name: "types",
  });

  // For dynamic Causes
  const {
    fields: causeFields,
    append: appendCause,
    remove: removeCause,
  } = useFieldArray({
    control,
    name: "causes",
  });

  useEffect(() => {
    if (id) {
      getSymptomById(id).then((data) => {
        setSymptoms(data);
      });
    }
  }, [id]);

  // Safe JSON parsing with error handling for rich text content with images
  let data = {};
  try {
    if (itemParam) {
      // Try to decode URL-encoded data first (better for complex content)
      const decodedParam = decodeURIComponent(itemParam);
      data = JSON.parse(decodedParam);
    }
  } catch (error) {
    console.error("Error parsing symptom data:", error);
    console.warn(
      "Failed to parse symptom data - this might be due to embedded images in rich text content"
    );

    // Try alternative parsing method
    try {
      if (itemParam) {
        data = JSON.parse(itemParam);
      }
    } catch (secondError) {
      console.error("Second parsing attempt failed:", secondError);
      // Show user-friendly message and redirect to overview
      if (typeof toast !== "undefined") {
        toast.error(
          "Unable to load this entry for editing. This may be due to embedded images in the content. Please try creating a new entry or contact support."
        );
      }
      // Fallback to empty data to allow form to load
      data = {};
    }
  }

  useEffect(() => {
    if (symptoms) {
      reset({
        symptom_name: symptoms.symptom_name || "",
        about: symptoms.about || "",
        diagnosis: symptoms.diagnosis || "",
        treating: symptoms.treating || "",
        complications: symptoms.complications || "",
        prevention: symptoms.prevention || "",
        specialist_to_contact: symptoms.specialist_to_contact || "",
        contact_your_doctor: symptoms.contact_your_doctor || "",
        more_information: symptoms.more_information || "",
        attribution: symptoms.attribution || "",
        types:
          symptoms.types && symptoms.types.length > 0
            ? symptoms.types
            : [{ type_name: "", about_type: "" }],
        causes:
          symptoms.causes && symptoms.causes.length > 0
            ? symptoms.causes
            : [{ cause_name: "", other_possible_causes: "" }],
      });

      // ✅ handle image preview
      if (symptoms.image_url) {
        setImageUrl(symptoms.image_url); // if you stored publicUrl in DB
        // or, if you stored only path, convert to public URL:
        // const { data } = supabase.storage.from("symptoms").getPublicUrl(symptoms.image_url);
        // setImageUrl(data.publicUrl);
      }
    }
  }, [symptoms, reset]);

  const onSubmit = async (formData) => {
    try {
      let imageUrl = "";

      if (imageFile) {
        imageUrl = await uploadSingleFileToSupabase(imageFile, "symptoms");
        setImageUrl(imageUrl); // ← optional, for preview if needed after submit
      }

      const listType = formData.symptom_name.charAt(0).toUpperCase();
      const newData = {
        ...formData,
        list_type: listType,
        image_url: imageUrl || symptoms?.image_url || "",
      };

      if (symptoms?.id) {
        await updateSymptom(symptoms?.id, newData);
        handleSuccess(router, "Updated Successfully");
        router.push("/categories/symptoms/overview");
        reset();
      } else {
        setLoading(true);
        add_symptoms(
          newData,
          () => {
            setLoading(true);
          },
          (successData) => {
            setLoading(false);
            toast.success("Added Successfully");
            router.push("/categories/symptoms/overview");
            reset({
              symptom_name: "",
              about: "",
              diagnosis: "",
              treating: "",
              complications: "",
              prevention: "",
              specialist_to_contact: "",
              contact_your_doctor: "",
              more_information: "",
              attribution: "",
              types: [{ type_name: "", about_type: "" }],
              causes: [{ cause_name: "", other_possible_causes: "" }],
            });

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
    } catch (error) {
      toast.error("Something went wrong");
      console.error("Submission Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="w-full grid md:grid-cols-2 grid-cols-1 gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <TextinputNew
        name="symptom_name"
        label="Symptom Name"
        type="text"
        placeholder="Enter Symptom Name"
        register={register}
        defaultValue={data?.symptom_name || ""}
        error={errors.symptom_name}
      />
      <Controller
        name="about"
        control={control}
        defaultValue={data?.about || ""}
        render={({ field: { onChange, value } }) => (
          <RichTextEditor
            name="about"
            label="About"
            placeholder="Enter About Information"
            value={value || ""}
            onChange={onChange}
            error={errors.about}
          />
        )}
      />

      <div className="md:col-span-2">
        <label className="block font-medium text-gray-700 dark:text-slate-200 mb-3">
          Types
        </label>
        {typeFields.map((field, index) => (
          <div
            key={field.id}
            className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-slate-800"
          >
            <div className="flex justify-end items-end mb-3">
              {/* <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Type {index + 1}</h4> */}
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeType(index)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Remove Type"
                >
                  <Icon
                    icon={"material-symbols:close"}
                    width={20}
                    height={20}
                  />
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <Controller
                name={`types.${index}.type_name`}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextinputNew
                    {...field}
                    label="Type Name"
                    placeholder="Enter Type Name"
                    error={errors.types?.[index]?.type_name}
                  />
                )}
              />
              <Controller
                name={`types.${index}.about_type`}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <RichTextEditor
                    name={`types.${index}.about_type`}
                    label="About Type"
                    placeholder="Enter information about this type"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.types?.[index]?.about_type}
                  />
                )}
              />
            </div>
          </div>
        ))}
        <Button
          icon="heroicons-outline:plus-sm"
          iconClass="text-base"
          text="Add Type"
          type="button"
          onClick={() => appendType({ type_name: "", about_type: "" })}
          className="py-2 px-4 text-center font-normal border-2 hover:border-green-500 hover:text-green-500 border-green-500 hover:bg-white bg-green-500 text-white rounded-lg"
        />
        {errors.types?.message && (
          <p className="text-red-500 text-sm mt-1">{errors.types.message}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className="block font-medium text-gray-700 dark:text-slate-200 mb-3">
          Causes
        </label>
        {causeFields.map((field, index) => (
          <div
            key={field.id}
            className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-slate-800"
          >
            <div className="flex justify-end items-end mb-3">
              {/* <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Cause {index + 1}</h4> */}
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeCause(index)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Remove Cause"
                >
                  <Icon
                    icon={"material-symbols:close"}
                    width={20}
                    height={20}
                  />
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <Controller
                name={`causes.${index}.cause_name`}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextinputNew
                    {...field}
                    label="Cause Name"
                    placeholder="Enter Cause Name"
                    error={errors.causes?.[index]?.cause_name}
                  />
                )}
              />
              <Controller
                name={`causes.${index}.other_possible_causes`}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <RichTextEditor
                    name={`causes.${index}.other_possible_causes`}
                    label="Other Possible Causes"
                    placeholder="Enter other possible causes"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.causes?.[index]?.other_possible_causes}
                  />
                )}
              />
            </div>
          </div>
        ))}
        <Button
          icon="heroicons-outline:plus-sm"
          iconClass="text-base"
          text="Add Cause"
          type="button"
          onClick={() =>
            appendCause({ cause_name: "", other_possible_causes: "" })
          }
          className="py-2 px-4 text-center font-normal border-2 hover:border-green-500 hover:text-green-500 border-green-500 hover:bg-white bg-green-500 text-white rounded-lg"
        />
        {errors.causes?.message && (
          <p className="text-red-500 text-sm mt-1">{errors.causes.message}</p>
        )}
      </div>

      <Controller
        name="diagnosis"
        control={control}
        defaultValue={data?.diagnosis || ""}
        render={({ field: { onChange, value } }) => (
          <RichTextEditor
            name="diagnosis"
            label="Diagnosis"
            placeholder="Enter Diagnosis Information"
            value={value || ""}
            onChange={onChange}
            error={errors.diagnosis}
          />
        )}
      />
      <Controller
        name="treating"
        control={control}
        defaultValue={data?.treating || ""}
        render={({ field: { onChange, value } }) => (
          <RichTextEditor
            name="treating"
            label="Treating"
            placeholder="Enter Treating Information"
            value={value || ""}
            onChange={onChange}
            error={errors.treating}
          />
        )}
      />
      <Controller
        name="complications"
        control={control}
        defaultValue={data?.complications || ""}
        render={({ field: { onChange, value } }) => (
          <RichTextEditor
            name="complications"
            label="Complications"
            placeholder="Enter Complications Information"
            value={value || ""}
            onChange={onChange}
            error={errors.complications}
          />
        )}
      />
      <Controller
        name="prevention"
        control={control}
        defaultValue={data?.prevention || ""}
        render={({ field: { onChange, value } }) => (
          <RichTextEditor
            name="prevention"
            label="Prevention"
            placeholder="Enter Prevention Information"
            value={value || ""}
            onChange={onChange}
            error={errors.prevention}
          />
        )}
      />
      <TextinputNew
        name="specialist_to_contact"
        label="Specialist(s) to Contact"
        type="text"
        placeholder="Enter Specialist(s) to Contact"
        register={register}
        defaultValue={data?.specialist_to_contact || ""}
        error={errors.specialist_to_contact}
      />
      <Controller
        name="contact_your_doctor"
        control={control}
        defaultValue={data?.contact_your_doctor || ""}
        render={({ field: { onChange, value } }) => (
          <RichTextEditor
            name="contact_your_doctor"
            label="Contact your Doctor"
            placeholder="Enter Contact your Doctor Information"
            value={value || ""}
            onChange={onChange}
            error={errors.contact_your_doctor}
          />
        )}
      />
      <Controller
        name="more_information"
        control={control}
        defaultValue={data?.more_information || ""}
        render={({ field: { onChange, value } }) => (
          <RichTextEditor
            name="more_information"
            label="More Information"
            placeholder="Enter More Information"
            value={value || ""}
            onChange={onChange}
            error={errors.more_information}
          />
        )}
      />
      <Controller
        name="attribution"
        control={control}
        defaultValue={data?.attribution || ""}
        render={({ field }) => (
          <RichTextEditor
            name="attribution"
            label="Attribution"
            placeholder="Enter Attribution"
            value={field.value}
            onChange={field.onChange}
            error={errors.attribution}
          />
        )}
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
        {(imageUrl || symptoms?.image_url) && (
          <img
            src={imageUrl || symptoms?.image_url}
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
