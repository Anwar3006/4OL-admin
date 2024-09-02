import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { add_symptoms } from "@/app/services/symptoms";

export default function HealthyLiving() {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm();

  // For dynamic Types
  const { fields: typeFields, append: appendType, remove: removeType } = useFieldArray({
    control,
    name: "types",
  });

  // For dynamic Causes
  const { fields: causeFields, append: appendCause, remove: removeCause } = useFieldArray({
    control,
    name: "causes",
  });

  const onSubmit = (data) => {
    // Automatically generate list_type based on the first character of the name
    const listType = data.topic_name.charAt(0).toUpperCase();
    
    const newData = {
      ...data,
      list_type: listType, // Add the generated list_type to the data object
    };

    setLoading(true);

    add_symptoms(
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

      {/* Types with nested About Types */}
      <div className="">
        <label className="block font-medium text-gray-700 mb-2">Types</label>
        {typeFields.map((item, index) => (
          <div key={item.id} className="mb-4 border p-4 rounded">
            <Textinput
              name={`types[${index}].type_name`}
              label={`Type ${index + 1} Name`}
              type="text"
              placeholder="Type Name"
              register={register}
            />
            <Textarea
              name={`types[${index}].about_type`}
              label={`About Type ${index + 1}`}
              placeholder="Describe this type"
              register={register}
            />
            <button
              type="button"
              onClick={() => removeType(index)}
              className="text-red-500 mt-2 text-sm"
            >
              Remove Type
            </button>
          </div>
        ))}
        <Button
          icon="heroicons-outline:plus-sm"
          iconClass="text-base text-white "
          text="Add"
          type="button"
          onClick={() => appendType({ type_name: "", about_type: "" })}
          className="py-0 px-2  mt-2 border-none text-center bg-green-500 text-white"
        />
      </div>

      {/* Causes with nested Other Possible Causes */}
      <div className="">
        <label className="block font-medium text-gray-700">Causes</label>
        {causeFields.map((item, index) => (
          <div key={item.id} className="mb-4 border p-4 rounded">
            <Textinput
              name={`causes[${index}].cause_name`}
              label={`Cause ${index + 1} Name`}
              type="text"
              placeholder="Cause Name"
              register={register}
            />
            <Textarea
              name={`causes[${index}].other_possible_causes`}
              label={`Other Possible Causes ${index + 1}`}
              placeholder="Describe other possible causes"
              register={register}
            />
            <button
              type="button"
              onClick={() => removeCause(index)}
              className="text-red-500 mt-2"
            >
              Remove Cause
            </button>
          </div>
        ))}
        <Button
          icon="heroicons-outline:plus-sm"
          iconClass="text-base text-white "
          text="Add"
          type="button"
          onClick={() => appendCause({ cause_name: "", other_possible_causes: "" })}
          className="py-0 px-2  mt-2 border-none text-center bg-green-500 text-white"
        />
        
      </div>

      <Textarea name="diagnosis" label="Diagnosis" type="text" placeholder=" " register={register} />
      <Textarea name="treating" label="Treating" type="text" placeholder=" " register={register} />
      <Textarea name="complications" label="Complications" type="text" placeholder=" " register={register} />
      <Textarea name="prevention" label="Prevention" type="text" placeholder=" " register={register} />
      <Textinput name="specialist_to_contact" label="Specialist(s) to Contact" type="text" placeholder=" " register={register} />
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
