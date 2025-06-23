import { formatDate } from "@/app/utils/helpers";

export const facilityFields = [
    { label: "Facility Name", key: "facility_name" },
    { label: "Facility Type", key: "facility_type" },
    { label: "Contact Number", key: "contact_num" },
    { label: "Whatsapp", key: "whatsapp" },
    { label: "Email", key: "email", format: (v) => v.toLowerCase() },
    { label: "GPS Address", key: "gps_address" },
    { label: "Street", key: "street" },
    { label: "Post Code", key: "post_code" },
    { label: "Area", key: "area" },
    { label: "District", key: "district" },
    { label: "Region", key: "region" },
    { label: "Country", key: "country" },
    {
      label: "Hospital Services",
      key: "hospital_services",
      format: (v) => v?.join(", "),
    },
    {
      label: "Hospital Amenities",
      key: "hospital_amenities",
      format: (v) => v?.join(", "),
    },
    {
      label: "Pharmacy Services",
      key: "pharmacy_services",
      format: (v) => v?.join(", "),
    },
    {
      label: "Created At",
      key: "created_at",
      format: (v) => formatDate(v),
    },
  ];