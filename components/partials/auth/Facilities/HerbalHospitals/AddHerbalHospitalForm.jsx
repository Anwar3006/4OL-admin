import React, { useState, useEffect } from "react";
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
import Dropdown from "@/components/ui/Dropdown";
import Icons from "@/components/ui/Icon";
import { districts_regions } from "@/constant/ghana_regions_districts_coordinates";
import useDeviceInfo from "@/hooks/useDeviceInfo";
import useGhanaPostGPS from "@/hooks/useGhanaPostGPS";
import useGeolocation from "@/hooks/useLocation";
import { ActivityIndicator } from "@/components/ui/ActivityIndicator";
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
  keywords: yup.string(),
  device_type: yup.string(),
  device_name: yup.string(),
  device_model: yup.string(),
  device_vendor: yup.string(),
  os: yup.string(),
  os_version: yup.string(),
  browser: yup.string(),
  latitude: yup.string(),
  longitude: yup.string(),
});

const AddHerbalHospitalForm = () => {
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
    mode: "onChange",
  });

  // LOCATION, DEVICE, GHANA GPS
  const location = useGeolocation({ enableHighAccuracy: true });
  const deviceInfo = useDeviceInfo();
  const { fetchGhanaPostAddress, addressData, error } = useGhanaPostGPS();
  const [fetchingGPSLocation, setFetchingGPSLocation] = useState(false);

  useEffect(() => {
    console.log("Location: ", location || null);
    console.log("Device Info: ", deviceInfo);
    handleFetchAddress();
  }, [location.loaded]);

  const handleFetchAddress = async () => {
    setFetchingGPSLocation(true);
    if (
      location.loaded &&
      !location.error &&
      location.coordinates.lat &&
      location.coordinates.lng
    ) {
      await fetchGhanaPostAddress(
        location.coordinates.lat,
        location.coordinates.lng
      )
        .then((data) => {
          if (data && data?.data?.Table !== null) {
            setValue("longitude", location.coordinates.lng);
            setValue("latitude", location.coordinates.lat);
            setValue("gps_address", data?.data?.Table[0]?.GPSName || "");
            setValue("street", data?.data?.Table[0]?.Street || "");
            setValue("post_code", data?.data?.Table[0]?.PostCode || "");
            setValue("area", data?.data?.Table[0]?.Area || "");
            setValue("region", data?.data?.Table[0]?.Region || "");
            setValue("district", data?.data?.Table[0]?.District || "");
          }
        })
        .finally(() => setFetchingGPSLocation(false));
    }
  };

  useEffect(() => {
    setValue("device_name", deviceInfo.deviceName);
    setValue("device_model", deviceInfo.deviceModel);
    setValue("device_vendor", deviceInfo.deviceVendor);
    setValue("os", deviceInfo.os);
    setValue("os_version", deviceInfo.osVersion);
    setValue("device_type", deviceInfo.isMobile ? "Mobile" : "Desktop");
    setValue("browser", deviceInfo.browser);

    // console.log("Device Info: ", JSON.stringify(value, null, 2));
  }, [deviceInfo.loaded]);

  //   const selectedFacilityType = watch("facility_type") || [];
  const selectedHospitalServices = watch("hospital_services") || [];
  const selectedHospitalAmenities = watch("hospital_amenities") || [];
  const selectedPharmacyServices = watch("pharmacy_services") || [];

  const ghanaRegions = districts_regions.data;
  const [selectedRegion, setSelectedRegion] = useState(ghanaRegions[6]);
  const [selectedDistrict, setSelectedDistrict] = useState(
    selectedRegion.districts[0].name
  );
  const [availableDistricts, setAvailableDistricts] = useState([]);

  useEffect(() => {
    setSelectedDistrict(selectedRegion.districts[0].name);
    console.log(JSON.stringify(selectedRegion, null, 2));
    const availableDistricts = selectedRegion.districts.map((district) => ({
      label: district.name,
    }));
    setAvailableDistricts(availableDistricts);
  }, [selectedRegion]);

  const handleImageUpload = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    setMediaFiles((prev) => {
      const mergedFiles = [...prev, ...newFiles];
      if (mergedFiles.length > 6) {
        mergedFiles.length = 6;
      }
      setPreview((prevPreview) => {
        if (prevPreview) {
          prevPreview.forEach((url) => URL.revokeObjectURL(url));
        }
        return mergedFiles.map((file) => URL.createObjectURL(file));
      });
      return mergedFiles;
    });
    setMediaType("multiple");
    e.target.value = ""; // Reset input
  };

  useEffect(() => {
    return () => {
      if (preview) {
        preview.forEach((url) => URL.revokeObjectURL(url));
      }
    };
  }, [preview]);

  const onSubmit = async (user) => {
    setLoading(true);
    const mediaUrls = await uploadMediaFiles(
      "media",
      "add_facility",
      "healthcare_profiles",
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

    const facility = "Herbal Hospital";

    const updatedUser = {
      ...user,
      facility_type: facility,
      business_hours: businessHours,
      mediaUrls,
    };

    console.log("updated data", updatedUser);

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
          <div>
            <Textinput
              name="facility_name"
              label="Facility Name"
              type="text"
              placeholder=" "
              register={register}
              error={errors.facility_name?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.facility_name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.facility_name && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.facility_name?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="contact_num"
              label="Contact Number"
              type="text"
              placeholder=" "
              register={register}
              error={errors.contact_num?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.contact_num ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.contact_num && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.contact_num?.message} *
              </p>
            )}
          </div>
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
        <div className="grid sm:grid-cols-2 grid-cols-1 sm:gap-4 gap-4">
          <div>
            <div className="flex flex-row flex-grow items-end gap-2 w-full">
              <div className="flex-grow">
                <Textinput
                  name="gps_address"
                  label="GPS Address"
                  type="text"
                  placeholder=""
                  register={register}
                  error={errors.gps_address?.message}
                  required
                  className={`border p-2 ${
                    errors?.gps_address ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>
              <button
                disabled={fetchingGPSLocation}
                type="button"
                className="flex flex-row items-center btn px-4 bg-[#56ce84] text-white"
                onClick={() => {
                  handleFetchAddress();
                }}
              >
                {fetchingGPSLocation ? (
                  <ActivityIndicator />
                ) : (
                  <>
                    <Icons
                      icon="heroicons-outline:refresh"
                      width={24}
                      className="mr-2"
                    />
                  </>
                )}
                Refresh
              </button>
            </div>
            {errors?.gps_address && (
              <p className="text-red-500 text-xs">
                {errors?.gps_address?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="street"
              label="Street"
              type="text"
              placeholder=" "
              register={register}
              error={errors.street?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.street ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.street && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.street?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="post_code"
              label="Post Code"
              type="text"
              placeholder=" "
              register={register}
              error={errors.post_code?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.post_code ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.post_code && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.post_code?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="area"
              label="Area"
              type="text"
              placeholder=" "
              register={register}
              error={errors.area?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.area ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.area && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.area?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="district"
              label="District"
              type="text"
              placeholder=" "
              register={register}
              error={errors.district?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.district ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.district && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.district?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="region"
              label="Region"
              type="text"
              placeholder=" "
              register={register}
              error={errors.region?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.region ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.region && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.region?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="country"
              label="Country"
              type="text"
              placeholder=" "
              register={register}
              error={errors.country?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.country ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.country && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.country?.message} *
              </p>
            )}
          </div>
          <Textinput
            name="keywords"
            label="Keywords"
            type="text"
            placeholder="comma separated, upto 20"
            register={register}
          />
        </div>
      </div>

      <div className="flex sm:grid-cols-2 grid-cols-1 sm:gap-4 w-full mt-2">
        <div className="w-full">
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

        <div className="w-full">
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

        {/* <div>
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
        </div> */}
      </div>

      <div>
        <p className="font-semibold my-5">Contact Person</p>
        <div className="grid sm:grid-cols-2 grid-cols-1 sm:gap-4">
          <div>
            <Textinput
              name="first_name"
              label="First Name"
              type="text"
              placeholder=" "
              register={register}
              error={errors.first_name?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.first_name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.first_name && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.first_name?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="last_name"
              label="Last Name"
              type="text"
              placeholder=" "
              register={register}
              error={errors.last_name?.message}
              required // Added required prop
              className={`border p-2 ${
                errors?.last_name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors?.last_name && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.last_name?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="person_contact_number"
              label="Contact Number"
              type="text"
              placeholder=" "
              register={register}
              error={errors.person_contact_number?.message}
              required
              className={`border p-2 ${
                errors?.person_contact_number
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              // No error handling for WhatsApp
            />
            {errors?.person_contact_number && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.person_contact_number?.message} *
              </p>
            )}
          </div>
          <div>
            <Textinput
              name="position"
              label="Position"
              type="text"
              placeholder=" "
              register={register}
              error={errors.position?.message}
              required
              className={`border p-2 ${
                errors?.position ? "border-red-500" : "border-gray-300"
              }`}
              // No error handling for WhatsApp
            />
            {errors?.position && (
              <p className="text-red-500 text-xs mt-2">
                {errors?.position?.message} *
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <p className="font-semibold my-5">Business Info</p>
        <div className="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-8">
          {/* First half of the days */}
          <div>
            {["monday", "tuesday", "wednesday", "thursday"].map((day) => (
              <div key={day} className="mb-6">
                <div className="mb-2">
                  <label className="font-semibold capitalize">{day}</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
              </div>
            ))}
          </div>
          <div>
            {["friday", "saturday", "sunday"].map((day) => (
              <div key={day} className="mb-6">
                <div className="mb-2">
                  <label className="font-semibold capitalize">{day}</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
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

export default AddHerbalHospitalForm;
