import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
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
import { supabase } from "@/app/utils/supabaseClient";

// Schema for validation
const schema = yup.object().shape({
  // facility_type: yup
  //   .string()
  //   .oneOf(
  //     ['Conditions', 'Pills Reminder', 'Period Tracker', 'Services', 'Amenities', 'Specialities'],
  //     "Select a valid Facility Type"
  //   )
  //   .required("Facility Type is required"),
  // hospital_services: yup.string().required("Service is required"),
  // hospital_amenities: yup.string().required("Amenity is required"),
  // pharmacy_services: yup.string().required("Pharmacy Service is required"),
  facility_name: yup.string().required("Facility Name is required"),
  contact_num: yup.string().required("Contact Number is required"),
  // whatsapp: yup.string().required("Whatsapp is required"),
  gps_address: yup.string().required("GPS Address is required"),
  street: yup.string().required("Street is required"),
  post_code: yup.string().required("Post Code is required"),
  area: yup.string().required("Area is required"),
  district: yup.string().required("District is required"),
  // district: yup.string().required("District is required"),
  region: yup.string().required("Region is required"),
  country: yup.string().required("Country is required"),
  first_name: yup.string().required("First Name is required"),
  last_name: yup.string().required("Last Name is required"),
  person_contact_number: yup.string().required("Contact Number is required"),
  position: yup.string().required("Position is required"),
  keywords: yup.string(),
});

const EditFacilityProfileForm = () => {
  const [loading, setLoading] = useState(false);
  const [facilityData, setFacilityData] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Extract ID from query parameters
  const id = searchParams.get("id");

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
  const selectedStatus = watch("status");

  useEffect(() => {
    if (id) {
      const fetchFacilityData = async () => {
        try {
          // Fetch data from Supabase
          const { data, error } = await supabase
            .from("healthcare_profiles")
            .select("*")
            .eq("id", id)
            .single();

          if (error) throw error;

          setFacilityData(data);
          console.log("Fetched data:", data);
          // Populate form with existing data
          Object.keys(data).forEach((key) => {
            setValue(key, data[key]);
            console.log(`Setting ${key} to ${data[key]}`);
          });
        } catch (error) {
          console.error("Error fetching data:", error);
          toast.error("Failed to fetch data");
        }
      };

      fetchFacilityData();
    }
  }, [id, setValue]);

  const onSubmit = async (formData) => {
    setLoading(true);

    try {
      // Perform update action
      const { error } = await supabase
        .from("healthcare_profiles")
        .update(formData)
        .eq("id", id);

      if (error) throw error;

      toast.success("Data updated successfully");
      router.push(`/facilities/pending-reviews`);
    } catch (error) {
      console.error("Error updating data:", error);
      toast.error("Failed to update data");
    } finally {
      setLoading(false);
    }
  };

  if (!id) return <p>Loading...</p>;

  return (
    <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
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
            required
          />
          <Textinput
            name="contact_num"
            label="Contact Number"
            type="text"
            placeholder=" "
            register={register}
            error={errors.contact_num?.message}
            required
          />
          <Textinput
            name="whatsapp"
            label="Whatsapp Number"
            type="text"
            placeholder=" "
            register={register}
            error={errors.whatsapp?.message}
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
            required
          />
          <Textinput
            name="street"
            label="Street"
            type="text"
            placeholder=" "
            register={register}
            error={errors.street?.message}
            required
          />
          <Textinput
            name="post_code"
            label="Post Code"
            type="text"
            placeholder=" "
            register={register}
            error={errors.post_code?.message}
            required
          />
          <Textinput
            name="area"
            label="Area"
            type="text"
            placeholder=" "
            register={register}
            error={errors.area?.message}
            required
          />
          <Textinput
            name="district"
            label="District"
            type="text"
            placeholder=" "
            register={register}
            error={errors.district?.message}
            required
          />
          <Textinput
            name="region"
            label="Region"
            type="text"
            placeholder=" "
            register={register}
            error={errors.region?.message}
            required
          />
          <Textinput
            name="country"
            label="Country"
            type="text"
            placeholder=" "
            register={register}
            error={errors.country?.message}
            required
          />
          <Textinput
            name="keywords"
            label="Keywords"
            type="text"
            placeholder="comma separated, upto 20"
            register={register}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 grid-cols-1 w-full">
        <div
          className={`${
            facilityData?.facility_type === "Ambulance" ? "hidden" : "block"
          }`}
        >
          <p className="font-semibold my-5 ">Services</p>
          <SplitDropdown2
            label="Select Service"
            value={[selectedHospitalServices]}
            onChange={(value) => setValue("hospital_services", value)}
            items={HOSPITAL_SERVICES.map((service) => ({ label: service }))}
            isMultiSelect={true}
            wrapperClass="sm:mr-3"
          />
        </div>

        <div>
          <p className="font-semibold my-5">Amenities</p>
          <SplitDropdown2
            label="Select Amenities"
            value={[selectedHospitalAmenities]}
            onChange={(value) => setValue("hospital_amenities", value)}
            items={HOSPITAL_AMENITIES.map((amenity) => ({ label: amenity }))}
            isMultiSelect={true}
            wrapperClass="sm:mr-3"
          />
        </div>

        <div
          className={`${
            facilityData?.facility_type !== "Pharmacy" ? "hidden" : "block"
          }`}
        >
          <p className="font-semibold my-5">Pharmacy Services</p>
          <SplitDropdown2
            label="Select Pharmacy Services"
            value={[selectedPharmacyServices]}
            onChange={(value) => setValue("pharmacy_services", value)}
            items={PHARMACY_SERVICES.map((service) => ({ label: service }))}
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

      {/* <div className="my-5">
          <p className="font-semibold mb-5">Status</p>
          <SplitDropdown2
            label="Select Status"
            value={selectedStatus}
            onChange={(value) => setValue("status", value)}
            items={[
              { label: "Pending" },
              { label: "Approved" },
            ]}
          />
        </div> */}

      <button
        type="submit"
        disabled={loading}
        className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full mt-5"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>

      <ToastContainer />
    </form>
  );
};

export default EditFacilityProfileForm;
