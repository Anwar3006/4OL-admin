import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import TextinputNew from "@/components/ui/TextinputNew";
import RichTextEditor from "@/components/ui/RichTextEditor";
import HtmlRenderer from "@/components/ui/HtmlRenderer";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
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
  const [activeModal, setActiveModal] = useState(null); // 'types' or 'causes'
  const [newTypes, setNewTypes] = useState([]);
  const [newCauses, setNewCauses] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null); // Track which item is being edited
  const [editingType, setEditingType] = useState(null); // 'types' or 'causes'
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
    const textContent = value.replace(/<[^>]*>/g, '').trim();
    return textContent.length > 0;
  };
    const schema = yup.object().shape({
    symptom_name: yup.string().required("Symptom name is required"),
    about: yup
      .string()
      .required("About is required")
      .test("has-content", "About content is required", validateRichTextContent),
    diagnosis: yup
      .string()
      .required("Diagnosis is required")
      .test("has-content", "Diagnosis content is required", validateRichTextContent),
    treating: yup
      .string()
      .required("Treating is required")
      .test("has-content", "Treating content is required", validateRichTextContent),
    complications: yup
      .string()
      .required("Complications is required")
      .test("has-content", "Complications content is required", validateRichTextContent),
    prevention: yup
      .string()
      .required("Prevention is required")
      .test("has-content", "Prevention content is required", validateRichTextContent),
    specialist_to_contact: yup
      .string()
      .required("Specialist(s) to contact is required"),
    contact_your_doctor: yup
      .string()
      .required("Contact your doctor is required")
      .test("has-content", "Contact your doctor content is required", validateRichTextContent),
    more_information: yup
      .string()
      .required("More information is required")
      .test("has-content", "More information content is required", validateRichTextContent),
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
    console.warn("Failed to parse symptom data - this might be due to embedded images in rich text content");
    
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
      types: symptoms.types || [],
      causes: symptoms.causes || [],
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



  useEffect(() => {
    // Ensure at least one type and cause field exists
  }, [activeModal]);

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
        router.push('/categories/symptoms/overview')
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
            router.push('/categories/symptoms/overview')
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
              types: [],
              causes: [],
            });

            setImageFile(null);
            setImageUrl("");
            setNewTypes([]);
            setNewCauses([]);
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
          <div className="my-2 rounded sm:text-sm text-xs">
            {typeFields.length > 0 &&
            typeFields.some((field) => field.type_name || field.about_type) ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
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
                          <td className="border p-2 text-black">
                            {item.type_name}
                          </td>
                          <td className="border p-2 text-black">
                            <HtmlRenderer htmlContent={item.about_type} />
                          </td>
                          <td className="border p-2 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openModal("types", index)}
                                className="text-blue-500"
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
            {errors.types?.message && (
              <p className="text-red-500 text-sm mt-1">
                {errors.types.message}
              </p>
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
          <div className="my-2 rounded  sm:text-sm text-xs">
            {causeFields.length > 0 &&
            causeFields.some(
              (field) => field.cause_name || field.other_possible_causes
            ) ? (
              <div className="overflow-x-auto">
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
                          <td className="border p-2 text-black">
                            {item.cause_name}
                          </td>
                          <td className="border p-2 text-black">
                            <HtmlRenderer htmlContent={item.other_possible_causes} />
                          </td>
                          <td className="border p-2 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openModal("causes", index)}
                                className="text-blue-500"
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
            {errors.causes?.message && (
              <p className="text-red-500 text-sm mt-1">
                {errors.causes.message}
              </p>
            )}
          </div>
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
