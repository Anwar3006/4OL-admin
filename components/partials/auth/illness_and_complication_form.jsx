import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import { add_illness_and_condition } from "@/app/services/illness_and_condition";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@iconify/react";

export default function IllnessAndComplicationForm() {
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'types' or 'causes'
  const [newTypes, setNewTypes] = useState([]);
const [newCauses, setNewCauses] = useState([]);

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

  useEffect(() => {
    // Ensure at least one type and cause field exists
    if (activeModal === 'types' && typeFields.length === 0) {
      appendType({ type_name: "", about_type: "" });
    }
    if (activeModal === 'causes' && causeFields.length === 0) {
      appendCause({ cause_name: "", other_possible_causes: "" });
    }
  }, [activeModal, typeFields, causeFields, appendType, appendCause]);

  const onSubmit = (data) => {
    const listType = data.condition_name.charAt(0).toUpperCase();
    const newData = {
      ...data,
      list_type: listType,
    };

    setLoading(true);

    add_illness_and_condition(
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

  const openModal = (type) => {
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const addItemsToForm = (items, type) => {
    if (type === 'types') {
      newTypes.forEach(item => appendType(item));
      setNewTypes([]); // Clear the new items after adding them
    } else if (type === 'causes') {
      newCauses.forEach(item => appendCause(item));
      setNewCauses([]); // Clear the new items after adding them
    }
    closeModal();
  };

  const handleAddType = () => {
    const newType = { type_name: "", about_type: "" };
    setNewTypes([...newTypes, newType]); // Add new type to state
    appendType(newType); // Append to form immediately if needed
  };
  
  const handleAddCause = () => {
    const newCause = { cause_name: "", other_possible_causes: "" };
    setNewCauses([...newCauses, newCause]); // Add new cause to state
    appendCause(newCause); // Append to form immediately if needed
  };
  

  return (
    <>
      <form className="w-full grid md:grid-cols-2 grid-cols-1 gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Textinput name="condition_name" label="Condition Name" type="text" placeholder=" " register={register} />
        <Textarea name="about" label="About" placeholder=" " register={register} />

        <div>
          <label className="block font-medium text-gray-700 mb-2">Types</label>
          <Button
            icon="heroicons-outline:plus-sm"
            iconClass="text-base text-white"
            text="Add Type"
            type="button"
            onClick={() => openModal('types')}
            className="py-0 px-2 mt-2 border-none text-center bg-green-500 text-white"
          />
 <div className="mb-4 border p-4 rounded">
  {/* Check if there are any items in typeFields */}
  {typeFields.length > 0 ? (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="border p-2">Name</th>
          <th className="border p-2">About</th>
          <th className="border p-2"></th>
        </tr>
      </thead>
      <tbody>
        {typeFields.map((item, index) => (
          <tr key={item.id}>
            <td className="border p-2 text-black">{item.type_name}</td>
            <td className="border p-2 text-black">{item.about_type}</td>
            <td className="border p-2 text-center">
              <button
                type="button"
                onClick={() => removeType(index)}
                className="text-red-500"
                aria-label="Remove"
              >
                <Icon icon={'carbon:close-filled'} width={20} height={20} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className="sm:text-sm text-xs">No types added yet.</p> // Display a message or leave it empty when no items are present
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
            onClick={() => openModal('causes')}
            className="py-0 px-2 mt-2 border-none text-center bg-green-500 text-white"
          />
          {causeFields.map((item, index) => (
            <div key={item.id} className="mb-4 border p-4 rounded">
              <Textinput
                name={`causes[${index}].cause_name`}
                label={`Cause ${index + 1} Name`}
                type="text"
                placeholder="Cause Name"
                register={register}
                defaultValue={item.cause_name}
              />
              <Textarea
                name={`causes[${index}].other_possible_causes`}
                label={`Other Possible Causes ${index + 1}`}
                placeholder="Describe other possible causes"
                register={register}
                defaultValue={item.other_possible_causes}
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
        </div>

        <Textarea name="diagnosis" label="Diagnosis" type="text" placeholder=" " register={register} />
        <Textarea name="treating" label="Treating" type="text" placeholder=" " register={register} />
        <Textarea name="complications" label="Complications" type="text" placeholder=" " register={register} />
        <Textarea name="symptoms" label="Symptoms" type="text" placeholder=" " register={register} />
        <Textarea name="prevention" label="Prevention" type="text" placeholder=" " register={register} />
        <Textinput name="specialist_to_contact" label="Specialist(s) to Contact" type="text" placeholder=" " register={register} />
        <Textarea name="contact_your_doctor" label="Contact your Doctor" placeholder="Contact your Doctor or visit a health facility if" register={register} />
        <Textarea name="more_information" label="More Information" placeholder=" " register={register} />
        <Textinput name="attribution" label="Attribution" type="text" placeholder=" " register={register} />

        <button type="submit" className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full mt-5">
          {loading ? "Submitting..." : "Submit"}
        </button>

        <ToastContainer />
      </form>

      {/* Types Modal */}
  {/* Types Modal */}
{activeModal === 'types' && (
  <Modal
    activeModal={activeModal === 'types'}
    onClose={closeModal}
    title="Types"
    labelClass={'bg-[#56ce83]'}
    footerContent={
      <>
        <button
          onClick={() => addItemsToForm(newTypes, 'types')}
          className="btn btn-sm bg-green-500 text-white"
        >
          Added
        </button>
        <button onClick={closeModal} className="btn btn-sm bg-red-500 text-white">Cancel</button>
      </>
    }
  >
    {typeFields.map((item, index) => (
      <div key={item.id} className="mb-4 border p-4 rounded">
        <Textinput
          name={`types[${index}].type_name`}
          label={`Type ${index + 1} Name`}
          type="text"
          placeholder="Type Name"
          register={register}
          defaultValue={item.type_name}
        />
        <Textarea
          name={`types[${index}].about_type`}
          label={`About Type ${index + 1}`}
          placeholder="Describe this type"
          register={register}
          defaultValue={item.about_type}
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
      iconClass="text-base text-white"
      text="Add Type"
      type="button"
      onClick={handleAddType}
      className="py-0 px-2 mt-2 border-none text-center bg-green-500 text-white"
    />
  </Modal>
)}

{/* Causes Modal */}
{activeModal === 'causes' && (
  <Modal
    activeModal={activeModal === 'causes'}
    onClose={closeModal}
    title="Causes"
    labelClass={'bg-[#56ce83]'}
    footerContent={
     <>
        <button
          onClick={() => addItemsToForm(newCauses, 'causes')}
          className="btn btn-sm bg-green-500 text-white"
        >
          Added
        </button>
        <button onClick={closeModal} className="btn btn-sm bg-red-500 text-white">Cancel</button>
      </>
    }
  >
    {causeFields.map((item, index) => (
      <div key={item.id} className="mb-4 border p-4 rounded">
        <Textinput
          name={`causes[${index}].cause_name`}
          label={`Cause ${index + 1} Name`}
          type="text"
          placeholder="Cause Name"
          register={register}
          defaultValue={item.cause_name}
        />
        <Textarea
          name={`causes[${index}].other_possible_causes`}
          label={`Other Possible Causes ${index + 1}`}
          placeholder="Describe other possible causes"
          register={register}
          defaultValue={item.other_possible_causes}
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
      iconClass="text-base text-white"
      text="Add Cause"
      type="button"
      onClick={handleAddCause}
      className="py-0 px-2 mt-2 border-none text-center bg-green-500 text-white"
    />
  </Modal>
)}

    </>
  );
}
