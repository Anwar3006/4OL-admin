"use client";
import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import TextinputNew from "@/components/ui/TextinputNew"
import RichTextEditor from "@/components/ui/RichTextEditor";
import HtmlRenderer from "@/components/ui/HtmlRenderer";
import { add_illness_and_condition } from "@/app/services/illness_and_condition";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@iconify/react";
import { useSearchParams } from "next/navigation";
import { updateDisease } from "@/app/services/diseases-service";
import handleSuccess from "@/utils/handleSuccess";
import { useRouter } from "next/navigation";
import Fileinput from "@/components/ui/Fileinput";
import { uploadSingleFileToSupabase } from "@/app/utils/uploadMedia";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

export default function IllnessAndComplicationForm() {
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("disease");
  
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
  const [activeModal, setActiveModal] = useState(null); // 'types' or 'causes'
  const [newTypes, setNewTypes] = useState([]);
  const [newCauses, setNewCauses] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null); // Track which item is being edited
  const [editingType, setEditingType] = useState(null); // 'types' or 'causes'
  const router = useRouter();
  const [imageFile, setImageFile] = useState(null); // raw file
  const [imageUrl, setImageUrl] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Custom validation function for rich text content
  const validateRichText = (value) => {
    if (!value) return false;
    // Remove HTML tags and check if there's actual text content
    const textContent = value.replace(/<[^>]*>/g, '').trim();
    return textContent.length > 0;
  };

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
      resolver: yupResolver(schema)
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
    if (data?.id) {
      reset({
        condition_name: data.condition_name || "",
        about: data.about || "",
        diagnosis: data.diagnosis || "",
        treating: data.treating || "",
        complications: data.complications || "",
        symptoms: data.symptoms || "",
        prevention: data.prevention || "",
        specialist_to_contact: data.specialist_to_contact || "",
        contact_your_doctor: data.contact_your_doctor || "",
        more_information: data.more_information || "",
        attribution: data.attribution || "",
        types: data.types || [{ type_name: "", about_type: "" }],
        causes: data.causes || [{ cause_name: "", other_possible_causes: "" }],
      });
    } else {
      // For new forms, initialize with empty arrays (types and causes are now optional)
      // Users can add them manually if needed
    }
  }, [data?.id, appendType, appendCause, typeFields.length, causeFields.length]);

  const onSubmit = async (formData) => {
    console.log("Form submitted with data:", formData);
    console.log("Form errors:", errors);
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
        image_url: imageUrl || data?.image_url || "",
      };

      if (data?.id) {
        await updateDisease(data?.id, newData);
        handleSuccess(router, "Updated Successfully");
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
              types: [],
              causes: [],
            });

            setImageFile(null);
            setImageUrl("");
            setNewTypes([]);
            setNewCauses([]);
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

  const openModal = (type, editIndex = null) => {
    setActiveModal(type);
    setEditingIndex(editIndex);
    setEditingType(type);
    
    // If editing, populate the modal with existing data
    if (editIndex !== null) {
      if (type === 'types') {
        const existingType = typeFields[editIndex];
        setNewTypes([existingType]);
      } else if (type === 'causes') {
        const existingCause = causeFields[editIndex];
        setNewCauses([existingCause]);
      }
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingIndex(null);
    setEditingType(null);
    setNewTypes([]);
    setNewCauses([]);
  };

  const addItemsToForm = (items, type) => {
    const validItems = items.filter((item) =>
      Object.values(item).some((value) => value.trim() !== "")
    );

    if (type === "types") {
      if (editingIndex !== null) {
        // Update existing type
        const updatedTypes = [...typeFields];
        updatedTypes[editingIndex] = validItems[0];
        // Remove the old item and add the updated one
        removeType(editingIndex);
        setTimeout(() => {
          appendType(validItems[0]);
        }, 0);
      } else {
        // Add new types
        validItems.forEach((item) => appendType(item));
      }
      setNewTypes([]); // Clear the new items after adding them
    } else if (type === "causes") {
      if (editingIndex !== null) {
        // Update existing cause
        const updatedCauses = [...causeFields];
        updatedCauses[editingIndex] = validItems[0];
        // Remove the old item and add the updated one
        removeCause(editingIndex);
        setTimeout(() => {
          appendCause(validItems[0]);
        }, 0);
      } else {
        // Add new causes
        validItems.forEach((item) => appendCause(item));
      }
      setNewCauses([]); // Clear the new items after adding them
    }
    closeModal();
  };

  const handleAddType = () => {
    const newType = { type_name: "", about_type: "" };
    setNewTypes([...newTypes, newType]); // Add new type to state
  };

  const handleAddCause = () => {
    const newCause = { cause_name: "", other_possible_causes: "" };
    setNewCauses([...newCauses, newCause]); // Add new cause to state
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

        <div>
          <label className="block font-medium text-gray-700 dark:text-slate-200">Types</label>
          <Button
            icon="heroicons-outline:plus-sm"
            iconClass="text-base text-black hover:text-green-500"
            text="Add Type"
            type="button"
            onClick={() => openModal("types")}
            className="py-0 px-2 mt-2 text-center font-normal border-2 hover:border-green-500 hover:text-green-500 border-green-500 hover:bg-white bg-green-500 text-white rounded-full"
          />
          <div className="my-2 rounded">
            {typeFields.length > 0 &&
            typeFields.some((field) => field.type_name || field.about_type) ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse sm:text-sm text-xs">
                  <thead>
                    <tr>
                      <th className="border ">Name</th>
                      <th className="border">About</th>
                      <th className="border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeFields
                      .filter(
                        (item) =>
                          item.type_name.trim() !== "" ||
                          item.about_type.trim() !== ""
                      )
                      .map((item, index) => (
                        <tr key={item.id}>
                          <td className="border px-2 text-black">
                            {item.type_name}
                          </td>
                          <td className="border px-2 text-black">
                            <HtmlRenderer htmlContent={item.about_type} />
                          </td>
                          <td className="border px-2 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openModal("types", index)}
                                className="text-green-500"
                                aria-label="Edit"
                              >
                                <Icon
                                  icon={"heroicons-outline:pencil-alt"}
                                  width={16}
                                  height={16}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeType(index)}
                                className="text-red-500"
                                aria-label="Remove"
                              >
                                <Icon
                                  icon={"carbon:close-filled"}
                                  width={16}
                                  height={16}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="sm:text-sm text-xs">No types added yet.</p>
            )}
            {/* ✅ Type Array Error Message */}
            {errors.types?.message && (
              <p className="text-red-500 text-sm mt-1">{errors.types.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block font-medium text-gray-700 dark:text-slate-200">Causes</label>
          <Button
            icon="heroicons-outline:plus-sm"
            iconClass="text-base text-black hover:text-green-500"
            text="Add Cause"
            type="button"
            onClick={() => openModal("causes")}
            className="py-0 px-2 mt-2 text-center font-normal border-2 hover:border-green-500 hover:text-green-500 border-green-500 hover:bg-white bg-green-500 text-white rounded-full"
          />
          <div className="my-2 rounded ">
            {causeFields.length > 0 &&
            causeFields.some(
              (field) => field.cause_name || field.other_possible_causes
            ) ? (
              <div className="overflow-x-auto  sm:text-sm text-xs">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border ">Name</th>
                      <th className="border">Other Causes</th>
                      <th className="border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {causeFields
                      .filter(
                        (item) =>
                          item.cause_name.trim() !== "" ||
                          item.other_possible_causes.trim() !== ""
                      )
                      .map((item, index) => (
                        <tr key={item.id}>
                          <td className="border px-2 text-black">
                            {item.cause_name}
                          </td>
                          <td className="border px-2 text-black">
                            <HtmlRenderer htmlContent={item.other_possible_causes} />
                          </td>
                          <td className="border px-2 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openModal("causes", index)}
                                className="text-green-500"
                                aria-label="Edit"
                              >
                                <Icon
                                  icon={"heroicons-outline:pencil-alt"}
                                  width={16}
                                  height={16}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCause(index)}
                                className="text-red-500"
                                aria-label="Remove"
                              >
                                <Icon
                                  icon={"carbon:close-filled"}
                                  width={16}
                                  height={16}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="sm:text-sm text-xs">No causes added yet.</p>
            )}
            {/* ✅ Cause Array Error Message */}
            {errors.causes?.message && (
              <p className="text-red-500 text-sm mt-1">{errors.causes.message}</p>
            )}
          </div>
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
          {imageUrl && (
            <img
              src={imageUrl}
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

      {/* Types Modal */}
      {activeModal === "types" && (
        <Modal
          activeModal={activeModal === "types"}
          onClose={closeModal}
          title={editingIndex !== null ? "Edit Type" : "Add Types"}
          labelClass={"bg-[#56ce83]"}
          footerContent={
            <>
              <button
                onClick={() => {
                  addItemsToForm(newTypes, "types");
                  // setNewTypes([]); // Clear new types after adding
                }}
                className="btn btn-sm bg-green-500 text-white"
              >
                {editingIndex !== null ? "Update" : "Add"}
              </button>
              <button
                onClick={closeModal}
                className="btn btn-sm bg-gray-500 text-white"
              >
                Close
              </button>
            </>
          }
        >
          {newTypes.map((type, index) => (
            <div key={index} className="mb-4">
              <TextinputNew
                value={type.type_name}
                onChange={(e) => {
                  const updatedTypes = [...newTypes];
                  updatedTypes[index] = {
                    ...updatedTypes[index],
                    type_name: e.target.value,
                  };
                  setNewTypes(updatedTypes);
                }}
                label={`Type Name ${index + 1}`}
                placeholder="Type Name"
              />
              <RichTextEditor
                value={type.about_type}
                onChange={(content) => {
                  const updatedTypes = [...newTypes];
                  updatedTypes[index] = {
                    ...updatedTypes[index],
                    about_type: content,
                  };
                  setNewTypes(updatedTypes);
                }}
                label={`About ${index + 1}`}
                placeholder="About this type..."
              />
              <button
                type="button"
                onClick={() => {
                  const updatedTypes = newTypes.filter((_, i) => i !== index);
                  setNewTypes(updatedTypes);
                }}
                className="text-red-500 mt-2"
              >
                Remove
              </button>
            </div>
          ))}
          {editingIndex === null && (
            <button
              type="button"
              onClick={handleAddType}
              className="btn btn-sm bg-green-500 text-white"
            >
              Add Another Type
            </button>
          )}
        </Modal>
      )}

      {/* Causes Modal */}
      {activeModal === "causes" && (
        <Modal
          activeModal={activeModal === "causes"}
          onClose={closeModal}
          title={editingIndex !== null ? "Edit Cause" : "Add Causes"}
          labelClass={"bg-[#56ce83]"}
          footerContent={
            <>
              <button
                onClick={() => {
                  addItemsToForm(newCauses, "causes");
                  setNewCauses([]); // Clear new causes after adding
                }}
                className="btn btn-sm bg-green-500 text-white"
              >
                {editingIndex !== null ? "Update" : "Add"}
              </button>
              <button
                onClick={closeModal}
                className="btn btn-sm bg-gray-500 text-white"
              >
                Close
              </button>
            </>
          }
        >
          {newCauses.map((cause, index) => (
            <div key={index} className="mb-4">
              <TextinputNew
                value={cause.cause_name}
                onChange={(e) => {
                  const updatedCauses = [...newCauses];
                  updatedCauses[index] = {
                    ...updatedCauses[index],
                    cause_name: e.target.value,
                  };
                  setNewCauses(updatedCauses);
                }}
                label={`Cause Name ${index + 1}`}
                placeholder="Cause Name"
              />
              <RichTextEditor
                value={cause.other_possible_causes}
                onChange={(content) => {
                  const updatedCauses = [...newCauses];
                  updatedCauses[index] = {
                    ...updatedCauses[index],
                    other_possible_causes: content,
                  };
                  setNewCauses(updatedCauses);
                }}
                label={`Other Possible Causes ${index + 1}`}
                placeholder="Describe other possible causes..."
              />
              <button
                type="button"
                onClick={() => {
                  const updatedCauses = newCauses.filter((_, i) => i !== index);
                  setNewCauses(updatedCauses);
                }}
                className="text-red-500 mt-2"
              >
                Remove
              </button>
            </div>
          ))}
          {editingIndex === null && (
            <button
              type="button"
              onClick={handleAddCause}
              className="btn btn-sm bg-green-500 text-white"
            >
              Add Another Cause
            </button>
          )}
        </Modal>
      )}
    </>
  );
}
