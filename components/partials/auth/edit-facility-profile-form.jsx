import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  facility_type: yup.string().required("Select Facility Type"),
  hospital_services: yup.string().required("Select Any Service"),
  hospital_amenities: yup.string().required("Select Any Amenity"),
  pharmacy_services: yup.string().required("Select Any Service"),
  unique_id: yup.string().required("Id is required"),
  facility_name: yup.string().required("Facility Name is required"),
  contact_num: yup.string().required("Contact Number is required"),
  whatsapp: yup.string().required("Whatsapp is required"),
  gps_address: yup.string().required("GPS Address is required"),
  street: yup.string().required("Street is required"),
  post_code: yup.string().required("Post Code is required"),
  area: yup.string().required("Area is required"),
  district: yup.string().required("District is required"),
  district: yup.string().required("District is required"),
  region: yup.string().required("Region is required"),
  country: yup.string().required("Country is required"),
  status: yup.string().oneOf(['Active', 'In Active'], 'Status is required').required('Status is required'),
});

const EditFacilityProfileForm = () => {
  const [loading, setLoading] = useState(false);
  const [facilityData, setFacilityData] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

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
          // Populate form with existing data
          Object.keys(data).forEach((key) => {
            setValue(key, data[key]);
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
      router.push("/users-facility");
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
            name="unique_id"
            label="Unique ID"
            type="text"
            placeholder=" "
            error={errors.unique_id?.message}
            register={register}
          />
          <Textinput
            name="facility_name"
            label="Facility Name"
            type="text"
            placeholder=" "
            register={register}
            error={errors.facility_name?.message}
          />
          <Textinput
            name="contact_num"
            label="Contact Number"
            type="text"
            placeholder=" "
            register={register}
            error={errors.contact_num?.message}
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
          />
          <Textinput
            name="street"
            label="Street"
            type="text"
            placeholder=" "
            register={register}
            error={errors.street?.message}
          />
          <Textinput
            name="post_code"
            label="Post Code"
            type="text"
            placeholder=" "
            register={register}
            error={errors.post_code?.message}
          />
          <Textinput
            name="area"
            label="Area"
            type="text"
            placeholder=" "
            register={register}
            error={errors.area?.message}
          />
          <Textinput
            name="district"
            label="District"
            type="text"
            placeholder=" "
            register={register}
            error={errors.district?.message}
          />
          <Textinput
            name="region"
            label="Region"
            type="text"
            placeholder=" "
            register={register}
            error={errors.region?.message}
          />
          <Textinput
            name="country"
            label="Country"
            type="text"
            placeholder=" "
            register={register}
            error={errors.country?.message}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 grid-cols-1 w-full">
        <div>
          <p className="font-semibold my-5">Hospital Services</p>
          <SplitDropdown2
            label="Select Service"
            value={selectedHospitalServices}
            onChange={(value) => setValue("hospital_services", value)}
            items={HOSPITAL_SERVICES.map((service) => ({ label: service }))}
          />
        </div>

        <div>
          <p className="font-semibold my-5">Hospital Amenities</p>
          <SplitDropdown2
            label="Select Amenities"
            value={selectedHospitalAmenities}
            onChange={(value) => setValue("hospital_amenities", value)}
            items={HOSPITAL_AMENITIES.map((amenity) => ({ label: amenity }))}
          />
        </div>

        <div>
          <p className="font-semibold my-5">Pharmacy Services</p>
          <SplitDropdown2
            label="Select Pharmacy Services"
            value={selectedPharmacyServices}
            onChange={(value) => setValue("pharmacy_services", value)}
            items={PHARMACY_SERVICES.map((service) => ({ label: service }))}
          />
        </div>
      </div>

      <div className="my-5">
        <p className="font-semibold mb-5">Status</p>
        <SplitDropdown2
          label="Select Status"
          value={selectedStatus}
          onChange={(value) => setValue("status", value)}
          items={[
            { label: "Active" },
            { label: "In Active" },
          ]}
        />
      </div>

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
