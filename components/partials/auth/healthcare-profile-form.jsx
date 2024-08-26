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
  facility_type: yup
    .string()
    .oneOf(
      ['Conditions', 'Pills Reminder', 'Period Tracker', 'Services', 'Amenities', 'Specialities'],
      "Select a valid Facility Type"
    )
    .required("Facility Type is required"),
  hospital_services: yup.string().notOneOf(['Select One'], "Select a valid Service").required("Service is required"),
  hospital_amenities: yup.string().notOneOf(['Select One'], "Select a valid Amenity").required("Amenity is required"),
  pharmacy_services: yup.string().notOneOf(['Select One'], "Select a valid Pharmacy Service").required("Pharmacy Service is required"),
  facility_name: yup.string().required("Facility Name is required"),
  contact_num: yup.string().required("Contact Number is required"),
  // whatsapp: yup.string().required("Whatsapp is required"),
  gps_address: yup.string().required("GPS Address is required"),
  street: yup.string().required("Street is required"),
  post_code: yup.string().required("Post Code is required"),
  area: yup.string().required("Area is required"),
  district: yup.string().required("District is required"),
  region: yup.string().required("Region is required"),
  country: yup.string().required("Country is required"),
});

const FacilityProfileForm = () => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const selectedFacilityType = watch("facility_type");
  const selectedHospitalServices = watch("hospital_services");
  const selectedHospitalAmenities = watch("hospital_amenities");
  const selectedPharmacyServices = watch("pharmacy_services");

  const onSubmit = (user) => {
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
        reset(); // Reset form fields after successful submission
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
      <div className="mb-2">
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
            name="facility_name"
            label="Facility Name"
            type="text"
            placeholder=" "
            register={register}
            error={errors.facility_name?.message}
            required // Added required prop
          />
          <Textinput
            name="contact_num"
            label="Contact Number"
            type="text"
            placeholder=" "
            register={register}
            error={errors.contact_num?.message}
            required // Added required prop
          />
          <Textinput
            name="whatsapp"
            label="Whatsapp Number"
            type="text"
            placeholder=" "
            register={register}
            // No error handling for WhatsApp
          />
        </div>
      </div>

      <div>
        <p className="font-semibold my-5">Location</p>
        <div className="grid sm:grid-cols-2 grid-cols-1 sm:gap-4">
          <Textinput
            name="gps_address"
            label="GPS Address"
            type="text"
            placeholder=" "
            register={register}
            error={errors.gps_address?.message}
            required // Added required prop
          />
          <Textinput
            name="street"
            label="Street"
            type="text"
            placeholder=" "
            register={register}
            error={errors.street?.message}
            required // Added required prop
          />
          <Textinput
            name="post_code"
            label="Post Code"
            type="text"
            placeholder=" "
            register={register}
            error={errors.post_code?.message}
            required // Added required prop
          />
          <Textinput
            name="area"
            label="Area"
            type="text"
            placeholder=" "
            register={register}
            error={errors.area?.message}
            required // Added required prop
          />
          <Textinput
            name="district"
            label="District"
            type="text"
            placeholder=" "
            register={register}
            error={errors.district?.message}
            required // Added required prop
          />
          <Textinput
            name="region"
            label="Region"
            type="text"
            placeholder=" "
            register={register}
            error={errors.region?.message}
            required // Added required prop
          />
          <Textinput
            name="country"
            label="Country"
            type="text"
            placeholder=" "
            register={register}
            error={errors.country?.message}
            required // Added required prop
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 grid-cols-1 w-full mt-2">
        <div>
          <p className="font-semibold my-5">Hospital Services</p>
          <SplitDropdown2
            label="Select Service"
            value={selectedHospitalServices}
            onChange={(value) => setValue("hospital_services", value)}
            items={[
              { label: "Select One" },
              ...HOSPITAL_SERVICES.map((service) => ({ label: service })),
            ]}
          />
        </div>

        <div>
          <p className="font-semibold my-5">Hospital Amenities</p>
          <SplitDropdown2
            label="Select Amenities"
            value={selectedHospitalAmenities}
            onChange={(value) => setValue("hospital_amenities", value)}
            items={[
              { label: "Select One" },
              ...HOSPITAL_AMENITIES.map((amenity) => ({ label: amenity })),
            ]}
          />
        </div>

        <div>
          <p className="font-semibold my-5">Pharmacy Services</p>
          <SplitDropdown2
            label="Select Pharmacy Services"
            value={selectedPharmacyServices}
            onChange={(value) => setValue("pharmacy_services", value)}
            items={[
              { label: "Select One" },
              ...PHARMACY_SERVICES.map((service) => ({ label: service })),
            ]}
          />
        </div>
      </div>

      <button
        type="submit"
        // disabled={loading}
        className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full mt-5"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>

      <ToastContainer />
    </form>
  );
}

export default FacilityProfileForm;
