/** A labelled field on a details panel. `format` renders the raw value. */
type DetailField = {
  label: string;
  key: string;
  /**
   * Values are read off arbitrary DB rows by `key`, so they are genuinely
   * heterogeneous — some formatters take a string, others a string[]. Each
   * narrows its own input rather than the table pretending to one type.
   */
  format?: (v: any) => string;
};

import { formatDate } from "@/lib/format";

export const facilityFields: DetailField[] = [
    { label: "Facility Name", key: "facility_name" },
    { label: "Facility Type", key: "facility_type" },
    { label: "Contact Number", key: "contact_num" },
    { label: "Whatsapp", key: "whatsapp" },
    { label: "Email", key: "email", format: (v: string) => v.toLowerCase() },
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
      format: (v: string[]) => v?.join(", "),
    },
    {
      label: "Hospital Amenities",
      key: "hospital_amenities",
      format: (v: string[]) => v?.join(", "),
    },
    {
      label: "Pharmacy Services",
      key: "pharmacy_services",
      format: (v: string[]) => v?.join(", "),
    },
    {
      label: "Created At",
      key: "created_at",
      format: (v: string) => formatDate(v),
    },
  ];

export const reviewsFields: DetailField[] = [
    { label: "Name", key: "user_profiles.first_name" },
    { label: "Email", key: "user_profiles?.last_name" },
    { label: "Rating", key: "rating" },
    { label: "Review", key: "review" },
    { label: "Created At", key: "created_at", format: (v: string) => formatDate(v) },
  ];

export const userDetailsFields: DetailField[] = [
    { label: "Email", key: "email" },
    { label: "Phone", key: "phone_number" },
    { label: "Gender", key: "sex" },
    { label: "Date of Birth", key: "dob" },
    { label: "Created At", key: "created_at", format: (v: string) => formatDate(v) },
]