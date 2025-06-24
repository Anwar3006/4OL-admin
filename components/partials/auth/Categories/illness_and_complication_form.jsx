import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import TextinputNew from "@/components/ui/TextinputNew";
import TextareaNew from "@/components/ui/TextareaNew";
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
  const data = JSON.parse(itemParam) || {};
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'types' or 'causes'
  const [newTypes, setNewTypes] = useState([]);
  const [newCauses, setNewCauses] = useState([]);
  const router = useRouter();
  const [imageFile, setImageFile] = useState(null); // raw file
  const [imageUrl, setImageUrl] = useState("");

  const schema = yup.object().shape({
    condition_name: yup.string().required("Condition name is required"),
    about: yup.string().required("About is required"),
    diagnosis: yup.string().required("Diagnosis is required"),
    treating: yup.string().required("Treating is required"),
    complications: yup.string().required("Complications are required"),
    symptoms: yup.string().required("Symptoms are required"),
    prevention: yup.string().required("Prevention is required"),
    specialist_to_contact: yup
      .string()
      .required("Specialist(s) to contact is required"),
    contact_your_doctor: yup
      .string()
      .required("Contact your doctor is required"),
    more_information: yup.string().required("More information is required"),
    attribution: yup.string().required("Attribution is required"),

    // 👇 Add dynamic field validation
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
    // Ensure at least one type and cause field exists
  }, [activeModal]);

  const onSubmit = async (formData) => {
    setLoading(true);

    try {
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
            reset();
            setImageFile(null);
            setImageUrl("");
            setNewTypes([]);
            setNewCauses([]);
            while (typeFields.length) removeType(0);
            while (causeFields.length) removeCause(0);
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
      console.log(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  const openModal = (type) => {
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const addItemsToForm = (items, type) => {
    const validItems = items.filter((item) =>
      Object.values(item).some((value) => value.trim() !== "")
    );

    if (type === "types") {
      validItems.forEach((item) => appendType(item));
      setNewTypes([]); // Clear the new items after adding them
    } else if (type === "causes") {
      validItems.forEach((item) => appendCause(item));
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
          name="condition_name"
          label="Condition Name"
          type="text"
          placeholder=" "
          register={register}
          defaultValue={data?.condition_name || ""}
          error={errors.condition_name}
        />
        <TextareaNew
          name="about"
          label="About"
          placeholder=" "
          register={register}
          defaultValue={data?.about || ""}
          error={errors.about}
        />

        <div>
          <label className="block font-medium text-gray-700 mb-2">Types</label>
          <Button
            icon="heroicons-outline:plus-sm"
            iconClass="text-base text-white"
            text="Add Type"
            type="button"
            onClick={() => openModal("types")}
            className="py-0 px-2 mt-2 border-none text-center font-normal bg-green-500 rounded-sm text-white"
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
                      <th className="border"></th>
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
                            {item.about_type}
                          </td>
                          <td className="border px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeType(index)}
                              className="text-red-500"
                              aria-label="Remove"
                            >
                              <Icon
                                icon={"carbon:close-filled"}
                                width={20}
                                height={20}
                              />
                            </button>
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
          <label className="block font-medium text-gray-700">Causes</label>
          <Button
            icon="heroicons-outline:plus-sm"
            iconClass="text-base text-white"
            text="Add Cause"
            type="button"
            onClick={() => openModal("causes")}
            className="py-0 px-2 mt-2 border-none text-center font-normal bg-green-500 rounded-sm text-white"
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
                      <th className="border"></th>
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
                            {item.other_possible_causes}
                          </td>
                          <td className="border px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeCause(index)}
                              className="text-red-500"
                              aria-label="Remove"
                            >
                              <Icon
                                icon={"carbon:close-filled"}
                                width={20}
                                height={20}
                              />
                            </button>
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

        <TextareaNew
          name="diagnosis"
          label="Diagnosis"
          type="text"
          placeholder=" "
          register={register}
          defaultValue={data?.diagnosis}
          error={errors.diagnosis}
        />
        <TextareaNew
          name="treating"
          label="Treating"
          type="text"
          placeholder=" "
          register={register}
          defaultValue={data?.treating}
          error={errors.treating}
        />
        <TextareaNew
          name="complications"
          label="Complications"
          type="text"
          placeholder=" "
          register={register}
          defaultValue={data?.complications}
          error={errors.complications}
        />
        <TextareaNew
          name="symptoms"
          label="Symptoms"
          type="text"
          placeholder=" "
          register={register}
          defaultValue={data?.symptoms || ""}
          error={errors.symptoms}
        />
        <TextareaNew
          name="prevention"
          label="Prevention"
          type="text"
          placeholder=" "
          register={register}
          defaultValue={data?.prevention}
          error={errors.prevention}
        />
        <TextinputNew
          name="specialist_to_contact"
          label="Specialist(s) to Contact"
          type="text"
          placeholder=" "
          register={register}
          defaultValue={data?.specialist_to_contact}
          error={errors.specialist_to_contact}
        />
        <TextareaNew
          name="contact_your_doctor"
          label="Contact your Doctor"
          placeholder="Contact your doctor or visit a health facility if"
          register={register}
          defaultValue={data?.contact_your_doctor}
          error={errors.contact_your_doctor}
        />
        <TextareaNew
          name="more_information"
          label="More Information"
          placeholder=" "
          register={register}
          defaultValue={data?.more_information}
          error={errors.more_information}
        />
        <TextinputNew
          name="attribution"
          label="Attribution"
          type="text"
          placeholder=" "
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

      {/* Types Modal */}
      {activeModal === "types" && (
        <Modal
          activeModal={activeModal === "types"}
          onClose={closeModal}
          title="Types"
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
                Added
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
              <TextareaNew
                value={type.about_type}
                onChange={(e) => {
                  const updatedTypes = [...newTypes];
                  updatedTypes[index] = {
                    ...updatedTypes[index],
                    about_type: e.target.value,
                  };
                  setNewTypes(updatedTypes);
                }}
                label={`About ${index + 1}`}
                placeholder="About this type"
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
          <button
            type="button"
            onClick={handleAddType}
            className="btn btn-sm bg-green-500 text-white"
          >
            Add Another Type
          </button>
        </Modal>
      )}

      {/* Causes Modal */}
      {activeModal === "causes" && (
        <Modal
          activeModal={activeModal === "causes"}
          onClose={closeModal}
          title="Causes"
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
                Added
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
              <TextareaNew
                value={cause.other_possible_causes}
                onChange={(e) => {
                  const updatedCauses = [...newCauses];
                  updatedCauses[index] = {
                    ...updatedCauses[index],
                    other_possible_causes: e.target.value,
                  };
                  setNewCauses(updatedCauses);
                }}
                label={`Other Possible Causes ${index + 1}`}
                placeholder="Describe other possible causes"
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
          <button
            type="button"
            onClick={handleAddCause}
            className="btn btn-sm bg-green-500 text-white"
          >
            Add Another Cause
          </button>
        </Modal>
      )}
    </>
  );
}
