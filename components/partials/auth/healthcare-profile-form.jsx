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
import Fileinput from "@/components/ui/Fileinput";
import { supabase } from "@/app/utils/supabaseClient";
import { uploadMediaFiles } from "@/app/utils/uploadMedia";
import { useRouter } from "next/navigation";

const schema = yup.object().shape({
  // facility_type: yup
  //   .array()
  //   .of(yup.string().oneOf(['Conditions', 'Pills Reminder', 'Period Tracker', 'Services', 'Amenities', 'Specialities']))
  //   .min(1, "Select at least one Facility Type")
  //   .required("Facility Type is required"),
  // hospital_services: yup
  //   .array()
  //   .of(yup.string())
  //   .min(1, "Select at least one Service")
  //   .required("Service is required"),
  // hospital_amenities: yup
  //   .array()
  //   .of(yup.string())
  //   .min(1, "Select at least one Amenity")
  //   .required("Amenity is required"),
  // pharmacy_services: yup
  //   .array()
  //   .of(yup.string())
  //   .min(1, "Select at least one Pharmacy Service")
  //   .required("Pharmacy Service is required"),
  facility_name: yup.string().required("Facility Name is required"),
  contact_num: yup.string().required("Contact Number is required"),
  gps_address: yup.string().required("GPS Address is required"),
  street: yup.string().required("Street is required"),
  post_code: yup.string().required("Post Code is required"),
  area: yup.string().required("Area is required"),
  district: yup.string().required("District is required"),
  region: yup.string().required("Region is required"),
  country: yup.string().required("Country is required"),
  first_name: yup.string().required("First Name is required"),
  last_name: yup.string().required("Last Name is required"),
  person_contact_number: yup.string().required("Contact Number is required"),
  position: yup.string().required("Position is required"),
});

const FacilityProfileForm = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState("");

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

  const selectedFacilityType = watch("facility_type") || [];
  const selectedHospitalServices = watch("hospital_services") || [];
  const selectedHospitalAmenities = watch("hospital_amenities") || [];
  const selectedPharmacyServices = watch("pharmacy_services") || [];

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length <= 6) {
      setMediaType("multiple");
      const fileUrls = files.map((file) => URL.createObjectURL(file));
      setPreview(fileUrls);
      setMediaFiles(files);
    }
  };

  const onSubmit = async (user) => {
    setLoading(true);
    const mediaUrls = await uploadMediaFiles(
      "media",
      "add_facility",
      "facility_profile",
      mediaFiles
    );

    // Check for errors
    if (!mediaUrls || mediaUrls.length === 0) {
      toast.error("No media files uploaded.");
      return;
    } else if (mediaUrls >= 6) {
      toast.error("Maximum 6 files are allowed");
      return;
    }

    // Filter out any empty values in business hours
    const businessHours = Object.keys(user.business_hours || {}).reduce(
      (acc, day) => {
        const { opening, closing } = user.business_hours[day];
        if (opening && closing) {
          acc[day] = { opening, closing };
        }
        return acc;
      },
      {}
    );

    const updatedUser = {
      ...user,
      business_hours: businessHours,
      mediaUrls,
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
        router.back();
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
      {/* <div className="mb-2">
        <p className="font-semibold mb-5">Facility Type</p>
        <SplitDropdown2
          label="Select Facility"
          value={selectedFacilityType}
          placeholder=" "
          onChange={(value) => setValue("facility_type", value)}
          items={[
            { label: "Hospital" },
            { label: "Pharmacy" },
            { label: "Herbal Center" },
            { label: "Diagnostic Center" },
            { label: "Ambulance Service" },
            { label: "Pharmacy Wholesale" },
          ]}
          isMultiSelect={true}
        />
      </div> */}

      <div>
        <p className="font-semibold mb-5">Basic Information</p>
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
            label="Whatsapp Number (Optional)"
            type="text"
            placeholder=" "
            register={register}
            // No error handling for WhatsApp
          />
          <Textinput
            name="email"
            label="Email (Optional)"
            type="email"
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

      <div className="grid sm:grid-cols-3 grid-cols-1 sm:gap-4 w-full mt-2">
        <div>
          <p className="font-semibold my-5">Services</p>
          <SplitDropdown2
            label="Select Service"
            value={selectedHospitalServices}
            onChange={(value) => setValue("hospital_services", value)}
            items={[
              ...HOSPITAL_SERVICES.map((service) => ({ label: service })),
            ]}
            isMultiSelect={true}
          />
        </div>

        <div>
          <p className="font-semibold my-5">Amenities</p>
          <SplitDropdown2
            label="Select Amenities"
            value={selectedHospitalAmenities}
            onChange={(value) => setValue("hospital_amenities", value)}
            items={[
              ...HOSPITAL_AMENITIES.map((amenity) => ({ label: amenity })),
            ]}
            isMultiSelect={true}
          />
        </div>

        <div>
          <p className="font-semibold my-5">Pharmacy Services</p>
          <SplitDropdown2
            label="Select Pharmacy Services"
            value={selectedPharmacyServices}
            onChange={(value) => setValue("pharmacy_services", value)}
            items={[
              ...PHARMACY_SERVICES.map((service) => ({ label: service })),
            ]}
            isMultiSelect={true}
          />
        </div>
      </div>

      <div>
        <p className="font-semibold my-5">Contact Person</p>
        <div className="grid sm:grid-cols-2 grid-cols-1 sm:gap-4">
          <Textinput
            name="first_name"
            label="First Name"
            type="text"
            placeholder=" "
            register={register}
            error={errors.first_name?.message}
            required // Added required prop
          />
          <Textinput
            name="last_name"
            label="Last Name"
            type="text"
            placeholder=" "
            register={register}
            error={errors.last_name?.message}
            required // Added required prop
          />
          <Textinput
            name="person_contact_number"
            label="Contact Number"
            type="text"
            placeholder=" "
            register={register}
            error={errors.person_contact_number?.message}
            required
            // No error handling for WhatsApp
          />
          <Textinput
            name="position"
            label="Position"
            type="text"
            placeholder=" "
            register={register}
            error={errors.position?.message}
            required
            // No error handling for WhatsApp
          />
        </div>
      </div>

      <div className="mt-2">
        <p className="font-semibold my-5">Business Info</p>
        <div className="grid grid-cols-2 gap-8">
          {/* First half of the days */}
          <div>
            {["monday", "tuesday", "wednesday", "thursday"].map((day) => (
              <div key={day} className="grid grid-cols-3 gap-4 mb-4">
                <label className="font-semibold capitalize">{day}</label>
                <Textinput
                  name={`business_hours.${day}.opening`}
                  label="Opening Time"
                  type="time"
                  register={register}
                  error={errors.business_hours?.[day]?.opening?.message}
                  required
                />
                <Textinput
                  name={`business_hours.${day}.closing`}
                  label="Closing Time"
                  type="time"
                  register={register}
                  error={errors.business_hours?.[day]?.closing?.message}
                  required
                />
              </div>
            ))}
          </div>

          {/* Second half of the days */}
          <div>
            {["friday", "saturday", "sunday"].map((day) => (
              <div key={day} className="grid grid-cols-3 gap-4 mb-4">
                <label className="font-semibold capitalize">{day}</label>
                <Textinput
                  name={`business_hours.${day}.opening`}
                  label="Opening Time"
                  type="time"
                  register={register}
                  error={errors.business_hours?.[day]?.opening?.message}
                  required
                />
                <Textinput
                  name={`business_hours.${day}.closing`}
                  label="Closing Time"
                  type="time"
                  register={register}
                  error={errors.business_hours?.[day]?.closing?.message}
                  required
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="md:w-[40%] w-full">
        <p className="text-sm mb-2">
          Upload Photos <span className="text-red-600">(Upto 6 Images)</span>
        </p>
        <Fileinput
          label="Upload Images"
          name="mediaUrls"
          onChange={handleImageUpload}
          multiple={true}
          placeholder="Upload Images"
          selectedFiles={mediaType === "multiple" ? mediaFiles : []}
          preview={mediaType === "multiple" ? preview : ""}
          className="mb-2"
        />
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
};

export default FacilityProfileForm;
