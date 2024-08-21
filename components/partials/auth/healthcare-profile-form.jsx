import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import Textinput from "@/components/ui/Textinput";
import SplitDropdown2 from "@/components/ui/Split-Dropdown2";
import {
  HOSPITAL_AMENITIES,
  HOSPITAL_SERVICES,
  PHARMACY_SERVICES,
} from "@/constant/healthcare-profile-list";
import { healthcareProfile } from "@/app/services/healthcare-profile";

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
  const [loading, setLoading] = useState(false);

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

  const onSubmit = (user) => {
    debugger;
    setLoading(true);

    const updatedUser = {
      ...user,
    };

    healthcareProfile(
      updatedUser,
      () => {
        setLoading(true);
      },
      (successData) => {
        setLoading(false);
        toast.success("Healthcare Profile Added Successfully");
        console.log("Success:", successData);
        // router.replace("/login2"); // Uncomment if you want to redirect after submission
      },
      (error) => {
        setLoading(false);
        toast.error(error.message);
        console.error("Error:", error);
      }
    );
  };

  return (
    <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
      <ToastContainer />
      <div
        className="mb-2"
      >
       <p className="font-semibold mb-5">Facility Type</p> 
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

      <div>
        <p className="font-semibold my-5">Basic Information</p> 
        <div className="grid sm:grid-cols-2 grid-cols-1 sm:gap-4">
          <Textinput
            name="unique_id"
            label="Unique ID"
            type="text"
            placeholder=" "
            error={errors.unique_id}
            register={register}
          />
          <Textinput
            name="facility_name"
            label="Facility Name"
            type="text"
            placeholder=" "
            register={register}
            error={errors.facility_name}
          />
          <Textinput
            name="contact_num"
            label="Contact Number"
            type="text"
            placeholder=" "
            register={register}
            error={errors.contact_num}
          />
          <Textinput
            name="whatsapp"
            label="Whatsapp Number"
            type="text"
            placeholder=" "
            register={register}
            error={errors.whatsapp}
          />
        </div>
      </div>

      <div
      >
            <p className="font-semibold my-5">Location</p> 
        <div className="grid sm:grid-cols-2 grid-cols-1 sm:gap-4">
          <Textinput
            name="digital_address"
            label="Digital Address"
            type="text"
            placeholder=" "
            register={register}
            error={errors.digital_address}
          />
          <Textinput
            name="address"
            label="Address"
            type="text"
            placeholder=" "
            register={register}
            error={errors.address}
          />
          <Textinput
            name="city"
            label="City"
            type="text"
            placeholder=" "
            register={register}
            error={errors.city}
          />
          <Textinput
            name="region"
            label="Region"
            type="text"
            placeholder=" "
            register={register}
            error={errors.region}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 grid-cols-1 w-full">
        <div
        >
              <p className="font-semibold my-5">Hospital Services</p> 
          <SplitDropdown2
            label="Select Service"
            value={selectedHospitalServices}
            onChange={(value) => setValue("hospital_services", value)}
            items={HOSPITAL_SERVICES.map((service) => ({ label: service }))}
          />
        </div>

        <div
        >
              <p className="font-semibold my-5">Hospital Amenities</p> 
          <SplitDropdown2
            label="Select Amenities"
            value={selectedHospitalAmenities}
            onChange={(value) => setValue("hospital_amenities", value)}
            items={HOSPITAL_AMENITIES.map((amenity) => ({ label: amenity }))}
          />
        </div>

        <div
        >
              <p className="font-semibold my-5">Pharmacy Services</p> 
          <SplitDropdown2
            label="Select Pharmacy Services"
            value={selectedPharmacyServices}
            onChange={(value) => setValue("pharmacy_services", value)}
            items={PHARMACY_SERVICES.map((service) => ({ label: service }))}
          />
        </div>
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
