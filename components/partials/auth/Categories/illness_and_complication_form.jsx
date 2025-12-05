"use client";
import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import TextinputNew from "@/components/ui/TextinputNew"
import RichTextEditor from "@/components/ui/RichTextEditor";
import { add_illness_and_condition } from "@/app/services/illness_and_condition";
import Button from "@/components/ui/Button";
import { Icon } from "@iconify/react";
import { useSearchParams, useRouter } from "next/navigation";
import { getDiseaseById, updateDisease } from "@/app/services/diseases-service";
import handleSuccess from "@/utils/handleSuccess";
import Fileinput from "@/components/ui/Fileinput";
import { uploadSingleFileToSupabase } from "@/app/utils/uploadMedia";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

export default function IllnessAndComplicationForm() {
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("disease");
  const id = searchParams.get("id");
  const [disease, setDisease] = useState(null);

  useEffect(() => {
    if (id) {
      getDiseaseById(id).then((data) => {
        setDisease(data);
      });
    }
  }, [id])
  
  // Safe JSON parsing with error handling for rich text content with images
  let data = {};
  try {
    if (itemParam) {
      // Try to decode URL-encoded data first (better for complex content)
      const decodedParam = decodeURIComponent(itemParam);
      data = JSON.parse(decodedParam);
    }
  } catch (error) {
    console.error("Error parsing disease data:", error);
    console.warn("Failed to parse disease data - this might be due to embedded images in rich text content");
    
    // Try alternative parsing method
    try {
      if (itemParam) {
        data = JSON.parse(itemParam);
      }
    } catch (secondError) {
      console.error("Second parsing attempt failed:", secondError);
      // Show user-friendly message and redirect to overview
      if (typeof toast !== 'undefined') {
        toast.error("Unable to load this entry for editing. This may be due to embedded images in the content. Please try creating a new entry or contact support.");
      }
      // Fallback to empty data to allow form to load
      data = {};
    }
  }
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [imageFile, setImageFile] = useState(null); // raw file
  const [imageUrl, setImageUrl] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  const schema = yup.object().shape({
    condition_name: yup.string().required("Condition name is required"),
    attribution: yup.string().required("Attribution is required"),
    // Make all rich text fields optional for now to test
    about: yup.string().optional(),
    diagnosis: yup.string().optional(),
    treating: yup.string().optional(),
    complications: yup.string().optional(),
    symptoms: yup.string().optional(),
    prevention: yup.string().optional(),
    specialist_to_contact: yup.string().optional(),
    contact_your_doctor: yup.string().optional(),
    more_information: yup.string().optional(),

    // 👇 Add dynamic field validation - make these optional for now
    types: yup.array().optional(),
    causes: yup.array().optional(),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm(
    { 
      resolver: yupResolver(schema),
      defaultValues: {
        condition_name: "",
        about: "",
        diagnosis: "",
        treating: "",
        complications: "",
        symptoms: "",
        prevention: "",
        specialist_to_contact: "",
        contact_your_doctor: "",
        more_information: "",
        attribution: "",
        types: [{ type_name: "", about_type: "" }],
        causes: [{ cause_name: "", other_possible_causes: "" }],
      }
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
    // Initialize form with default values if editing
    if (disease) {
      reset({
        condition_name: disease.condition_name || "",
        about: disease.about || "",
        diagnosis: disease.diagnosis || "",
        treating: disease.treating || "",
        complications: disease.complications || "",
        symptoms: disease.symptoms || "",
        prevention: disease.prevention || "",
        specialist_to_contact: disease.specialist_to_contact || "",
        contact_your_doctor: disease.contact_your_doctor || "",
        more_information: disease.more_information || "",
        attribution: disease.attribution || "",
        types: disease.types && disease.types.length > 0 ? disease.types : [{ type_name: "", about_type: "" }],
        causes: disease.causes && disease.causes.length > 0 ? disease.causes : [{ cause_name: "", other_possible_causes: "" }],
      });
    }
  }, [disease, reset]);

  const onSubmit = async (formData) => {
    setFormSubmitted(true);
    setLoading(true);

    try {
      // Check if image is required and not provided
      if (!imageFile && !data?.image_url) {
        toast.error("Image is required");
        setLoading(false);
        setFormSubmitted(false);
        return;
      }

      let imageUrl = "";

      if (imageFile) {
        imageUrl = await uploadSingleFileToSupabase(
          imageFile,
          "illness-and-conditions"
        );
        setImageUrl(imageUrl); // ← optional, for preview if needed after submit
      }

      const listType = formData.condition_name
        ? formData.condition_name.charAt(0).toUpperCase()
        : "";

      const newData = {
        ...formData,
        list_type: listType,
        image_url: imageUrl || disease?.image_url || "",
      };

      if (disease?.id) {
        await updateDisease(disease?.id, newData);
        handleSuccess(router, "Updated Successfully");
        router.push('/categories/illness_and_complications/overview')
      } else {
        add_illness_and_condition(
          newData,
          () => setLoading(true),
          () => {
            setLoading(false);
            toast.success("Added Successfully");
               reset({
              condition_name: "",
              about: "",
              diagnosis: "",
              treating: "",
              complications: "",
              symptoms: "",
              prevention: "",
              specialist_to_contact: "",
              contact_your_doctor: "",
              more_information: "",
              attribution: "",
              types: [{ type_name: "", about_type: "" }],
              causes: [{ cause_name: "", other_possible_causes: "" }],
            });
            router.push("/categories/illness_and_complications/overview")

            setImageFile(null);
            setImageUrl("");
            setFormSubmitted(false);
          },
          (error) => {
            setLoading(false);
            toast.error(error.message);
            console.error("Error:", error);
          }
        );
      }
    } catch (err) {
      toast.error(err.message || "Something went wrong");
      console.log("Error during submission:", err);
      setLoading(false);
    }
  };

  const onError = (errors) => {
    console.log("Form validation errors:", errors);
    
    // Check if it's just the image that's missing
    if (Object.keys(errors).length === 0 && !imageFile && !data?.image_url) {
      toast.error("Please upload an image");
    } else if (Object.keys(errors).length > 0) {
      // Show specific field errors
      const firstError = Object.values(errors)[0];
      toast.error(firstError?.message || "Please fill in all required fields");
    } else {
      toast.error("Please fill in all required fields");
    }
  };


  return (
    <>
      <form
        className="w-full grid md:grid-cols-2 grid-cols-1 gap-4"
        onSubmit={handleSubmit(onSubmit, onError)}
      >
        <TextinputNew
          name="condition_name"
          label="Condition Name"
          type="text"
          placeholder="Enter the Condition Name"
          register={register}
          defaultValue={data?.condition_name || ""}
          error={errors.condition_name}
        />
        <Controller
          name="about"
          control={control}
          defaultValue={data?.about || ""}
          render={({ field }) => (
            <RichTextEditor
              name="about"
              label="About"
              placeholder="Enter About Information"
              value={field.value}
              onChange={field.onChange}
              error={errors.about}
            />
          )}
        />

        <div className="md:col-span-2">
          <label className="block font-medium text-gray-700 dark:text-slate-200 mb-3">Types</label>
          {typeFields.map((field, index) => (
            <div key={field.id} className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-slate-800">
              <div className="flex justify-end items-end mb-3">
                {/* <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Type {index + 1}</h4> */}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeType(index)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remove Type"
                  >
                    <Icon icon={"material-symbols:close"} width={20} height={20} />
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
          <label className="block font-medium text-gray-700 dark:text-slate-200 mb-3">Causes</label>
          {causeFields.map((field, index) => (
            <div key={field.id} className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-slate-800">
              <div className="flex justify-end items-end mb-3">
                {/* <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Cause {index + 1}</h4> */}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeCause(index)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remove Cause"
                  >
                    <Icon icon={"material-symbols:close"} width={20} height={20} />
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
            onClick={() => appendCause({ cause_name: "", other_possible_causes: "" })}
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
          render={({ field }) => (
            <RichTextEditor
              name="diagnosis"
              label="Diagnosis"
              placeholder="Enter Diagnosis Information"
              value={field.value}
              onChange={field.onChange}
              error={errors.diagnosis}
            />
          )}
        />
        <Controller
          name="treating"
          control={control}
          defaultValue={data?.treating || ""}
          render={({ field }) => (
            <RichTextEditor
              name="treating"
              label="Treating"
              placeholder="Enter Treating Information"
              value={field.value}
              onChange={field.onChange}
              error={errors.treating}
            />
          )}
        />
        <Controller
          name="complications"
          control={control}
          defaultValue={data?.complications || ""}
          render={({ field }) => (
            <RichTextEditor
              name="complications"
              label="Complications"
              placeholder="Enter Complications Information"
              value={field.value}
              onChange={field.onChange}
              error={errors.complications}
            />
          )}
        />
        <Controller
          name="symptoms"
          control={control}
          defaultValue={data?.symptoms || ""}
          render={({ field }) => (
            <RichTextEditor
              name="symptoms"
              label="Symptoms"
              placeholder="Enter Symptoms Information"
              value={field.value}
              onChange={field.onChange}
              error={errors.symptoms}
            />
          )}
        />
        <Controller
          name="prevention"
          control={control}
          defaultValue={data?.prevention || ""}
          render={({ field }) => (
            <RichTextEditor
              name="prevention"
              label="Prevention"
              placeholder="Enter Prevention Information"
              value={field.value}
              onChange={field.onChange}
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
          defaultValue={data?.specialist_to_contact}
          error={errors.specialist_to_contact}
        />
        <Controller
          name="contact_your_doctor"
          control={control}
          defaultValue={data?.contact_your_doctor || ""}
          render={({ field }) => (
            <RichTextEditor
              name="contact_your_doctor"
              label="Contact your Doctor"
              placeholder="Enter Contact your Doctor Information"
              value={field.value}
              onChange={field.onChange}
              error={errors.contact_your_doctor}
            />
          )}
        />
        <Controller
          name="more_information"
          control={control}
          defaultValue={data?.more_information || ""}
          render={({ field }) => (
            <RichTextEditor
              name="more_information"
              label="More Information"
              placeholder="Enter More Information"
              value={field.value}
              onChange={field.onChange}
              error={errors.more_information}
            />
          )}
        />
        <TextinputNew
          name="attribution"
          label="Attribution"
          type="text"
          placeholder="Enter Attribution"
          register={register}
          defaultValue={data?.attribution || ""}
          error={errors.attribution}
        />


        <div>
          <label
            htmlFor={"upload image"}
            className={`text-sm capitalize flex-0 mr-6 md:w-[100px] w-[60px] break-words`}
          >
            Upload Image <span className="text-red-500">*</span>
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
            placeholder="Upload Image (Required)"
            mediaType="image"
            className="my-2"
            accept="image/*"
          />
          {(imageUrl || disease?.image_url) && (
            <img
              src={imageUrl || disease?.image_url}
              alt="Preview"
              className="w-32 h-32 object-cover rounded mt-2 border"
            />
          )}
          {/* Show error if no image is selected */}
          {formSubmitted && !imageFile && !data?.image_url && (
            <p className="text-red-500 text-sm mt-1">Image is required</p>
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
    </>
  );
}
