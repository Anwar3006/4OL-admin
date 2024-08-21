import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import { useRouter } from "next/navigation";
import Textinput from "@/components/ui/Textinput";
import SplitDropdown2 from "@/components/ui/Split-Dropdown2";
import FormGroup from "@/components/ui/FormGroup";
import {
  HOSPITAL_AMENITIES,
  HOSPITAL_SERVICES,
  PHARMACY_SERVICES,
} from "@/constant/healthcare-profile-list";
import { supabase } from "@/app/utils/supabaseClient";

// Define the schema using yup
const schema = yup.object().shape({
  facility_type: yup.string().required("Select Facility Type"),
  hospital_services: yup.string().required("Select Any Service"),
  hospital_amenities: yup.string().required("Select Any Amenity"),
  pharmacy_services: yup.string().required("Select Any Service"),
  unique_id: yup.string().required("Id is required"),
  facility_name: yup.string().required("Facility Name is required"),
  contact_num: yup.string().required("Contact Number is required"),
  whatsapp: yup.string().required("Whatsapp is required"),
  location: yup.string().required("Location is required"),
  digital_address: yup.string().required("Digital Address is required"),
  address: yup.string().required("Address is required"),
  city: yup.string().required("City is required"),
  region: yup.string().required("Region is required"),
});

export default function FacilityProfileForm() {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const selectedFacilityType = watch("facility_type");
  const selectedHospitalServices = watch("hospital_services");
  const selectedHospitalAmenities = watch("hospital_amenities");
  const selectedPharmacyServices = watch("pharmacy_services");

  const onSubmit = async (data) => {
    setLoading(true);
    console.log("Form Data:", data); // Log the form data to verify
  
    try {
      // Insert data into Supabase
      const { data: insertData, error } = await supabase
        .from("healthcare_profiles")
        .insert([data]);
  
      if (error) {
        throw error; // Throw error to be caught in the catch block
      }
  
      toast.success("Form submitted successfully!");
    } catch (error) {
      console.error("Submission Error:", error.message); // Log detailed error message
      toast.error("Error submitting form: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
      <ToastContainer />
      {/* Your form groups and inputs */}
      <FormGroup
        id="facility_type"
        label="Facility Type"
        error={errors.facility_type}
        className="mb-2"
        classLabel="font-semibold mb-5"
      >
        <div>
          <SplitDropdown2
            label="Select Facility"
            value={selectedFacilityType}
            onChange={(value) => setValue("facility_type", value)}
            items={[
              { label: "Conditions" },
              { label: "Pills Reminder" },
              { label: "Period Tracker" },
              { label: "Services" },
              { label: "Amenities" },
              { label: "Specialities" },
            ]}
          />
        </div>
      </FormGroup>

      <FormGroup
        label="Basic Information"
        id="basic_information"
        error={errors.unique_id}
        className="mb-2"
        classLabel="font-semibold my-5"
      >
        <div className="grid sm:grid-cols-2 grid-cols-1 sm:gap-4">
          <Textinput
            name="unique_id"
            label="Unique ID"
            type="text"
            placeholder=" "
            register={register}
          />
          <Textinput
            name="facility_name"
            label="Facility Name"
            type="text"
            placeholder=" "
            register={register}
          />
          <Textinput
            name="contact_num"
            label="Contact Number"
            type="text"
            placeholder=" "
            register={register}
          />
          <Textinput
            name="whatsapp"
            label="Whatsapp Number"
            type="text"
            placeholder=" "
            register={register}
          />
        </div>
      </FormGroup>

      <FormGroup
        label="Location"
        id="location"
        error={errors.location}
        className="mb-2"
        classLabel="font-semibold my-5"
      >
        <div className="grid sm:grid-cols-2 grid-cols-1 sm:gap-4">
          <Textinput
            name="digital_address"
            label="Digital Address"
            type="text"
            placeholder=" "
            register={register}
          />
          <Textinput
            name="address"
            label="Address"
            type="text"
            placeholder=" "
            register={register}
          />
          <Textinput
            name="city"
            label="City"
            type="text"
            placeholder=" "
            register={register}
          />
          <Textinput
            name="region"
            label="Region"
            type="text"
            placeholder=" "
            register={register}
          />
        </div>
      </FormGroup>

      <div className="grid sm:grid-cols-3 grid-cols-1 w-full">
        <FormGroup
          id="hospital_services"
          label="Hospital Services"
          error={errors.hospital_services}
          className="mb-2"
          classLabel="font-semibold my-5"
        >
          <div className="sm:col-span-1 col-span-2">
            <SplitDropdown2
              label="Select Service"
              value={selectedHospitalServices}
              onChange={(value) => setValue("hospital_services", value)}
              items={HOSPITAL_SERVICES.map((service) => ({ label: service }))}
            />
          </div>
        </FormGroup>

        <FormGroup
          id="hospital_amenities"
          label="Hospital Amenities"
          error={errors.hospital_amenities}
          className="mb-2"
          classLabel="font-semibold my-5"
        >
          <div className="sm:col-span-1 col-span-2">
            <SplitDropdown2
              label="Select Amenities"
              value={selectedHospitalAmenities}
              onChange={(value) => setValue("hospital_amenities", value)}
              items={HOSPITAL_AMENITIES.map((amenity) => ({ label: amenity }))}
            />
          </div>
        </FormGroup>

        <FormGroup
          id="pharmacy_services"
          label="Pharmacy Services"
          error={errors.pharmacy_services}
          className="mb-2"
          classLabel="font-semibold my-5"
        >
          <div className="sm:col-span-1 col-span-2">
            <SplitDropdown2
              label="Select Service"
              value={selectedPharmacyServices}
              onChange={(value) => setValue("pharmacy_services", value)}
              items={PHARMACY_SERVICES.map((service) => ({ label: service }))}
            />
          </div>
        </FormGroup>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
