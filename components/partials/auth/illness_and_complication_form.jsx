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
  }, [activeModal]);

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
    const validItems = items.filter(item => 
      Object.values(item).some(value => value.trim() !== "")
    );

    if (type === 'types') {
      validItems.forEach(item => appendType(item));
      setNewTypes([]); // Clear the new items after adding them
    } else if (type === 'causes') {
      validItems.forEach(item => appendCause(item));
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
          <div className="my-2 rounded">
            {typeFields.length > 0 && typeFields.some(field => field.type_name || field.about_type) ? (
            <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border ">Name</th>
                  <th className="border">About</th>
                  <th className="border"></th>
                </tr>
              </thead>
              <tbody>
                {typeFields
                  .filter(item => item.type_name.trim() !== "" || item.about_type.trim() !== "")
                  .map((item, index) => (
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
          </div>
          
            ) : (
              <p className="sm:text-sm text-xs">No types added yet.</p>
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
          <div className="my-2 rounded">
            {causeFields.length > 0 && causeFields.some(field => field.cause_name || field.other_possible_causes) ? (
            <div className="overflow-x-auto">
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
                  .filter(item => item.cause_name.trim() !== "" || item.other_possible_causes.trim() !== "")
                  .map((item, index) => (
                    <tr key={item.id}>
                      <td className="border p-2 text-black">{item.cause_name}</td>
                      <td className="border p-2 text-black">{item.other_possible_causes}</td>
                      <td className="border p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeCause(index)}
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
          </div>
          
            ) : (
              <p className="sm:text-sm text-xs">No causes added yet.</p>
            )}
          </div>
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
      {activeModal === 'types' && (
        <Modal
          activeModal={activeModal === 'types'}
          onClose={closeModal}
          title="Types"
          labelClass={'bg-[#56ce83]'}
          footerContent={
            <>
              <button
                onClick={() => {
                  addItemsToForm(newTypes, 'types');
                  // setNewTypes([]); // Clear new types after adding
                }}
                className="btn btn-sm bg-green-500 text-white"
              >
                Added
              </button>
              <button onClick={closeModal} className="btn btn-sm bg-gray-500 text-white">
                Close
              </button>
            </>
          }
        >
          {newTypes.map((type, index) => (
            <div key={index} className="mb-4">
              <Textinput
                value={type.type_name}
                onChange={e => {
                  const updatedTypes = [...newTypes];
                  updatedTypes[index] = { ...updatedTypes[index], type_name: e.target.value };
                  setNewTypes(updatedTypes);
                }}
                label={`Type Name ${index + 1}`}
                placeholder="Type Name"
              />
              <Textarea
                value={type.about_type}
                onChange={e => {
                  const updatedTypes = [...newTypes];
                  updatedTypes[index] = { ...updatedTypes[index], about_type: e.target.value };
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
      {activeModal === 'causes' && (
        <Modal
          activeModal={activeModal === 'causes'}
          onClose={closeModal}
          title="Causes"
          labelClass={'bg-[#56ce83]'}
          footerContent={
            <>
              <button
                onClick={() => {
                  addItemsToForm(newCauses, 'causes');
                  setNewCauses([]); // Clear new causes after adding
                }}
                className="btn btn-sm bg-green-500 text-white"
              >
                Added
              </button>
              <button onClick={closeModal} className="btn btn-sm bg-gray-500 text-white">
                Close
              </button>
            </>
          }
        >
          {newCauses.map((cause, index) => (
            <div key={index} className="mb-4">
              <Textinput
                value={cause.cause_name}
                onChange={e => {
                  const updatedCauses = [...newCauses];
                  updatedCauses[index] = { ...updatedCauses[index], cause_name: e.target.value };
                  setNewCauses(updatedCauses);
                }}
                label={`Cause Name ${index + 1}`}
                placeholder="Cause Name"
              />
              <Textarea
                value={cause.other_possible_causes}
                onChange={e => {
                  const updatedCauses = [...newCauses];
                  updatedCauses[index] = { ...updatedCauses[index], other_possible_causes: e.target.value };
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
