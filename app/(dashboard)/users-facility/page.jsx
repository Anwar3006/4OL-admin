"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatDate } from "@/app/utils/helpers";

export default function HealthcareCenters() {
  const [data, setData] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const router = useRouter();

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("healthcare_profiles") // Replace with your table name
        .select("*");

      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setData(data);
      }
    };

    fetchData();
  }, []);

  // Filter data based on globalFilter
  const filteredData = data.filter((item) => {
    const searchText = (globalFilter || "").toLowerCase();
    return (
      (item.facility_name || "").toLowerCase().includes(searchText) ||
      (item.facility_type || "").toLowerCase().includes(searchText) ||
      (item.contact_num || "").toLowerCase().includes(searchText) ||
      (item.whatsapp || "").toLowerCase().includes(searchText) ||
      (item.gps_address || "").toLowerCase().includes(searchText) ||
      (item.street || "").toLowerCase().includes(searchText) ||
      (item.post_code || "").toLowerCase().includes(searchText) ||
      (item.area || "").toLowerCase().includes(searchText) ||
      (item.district || "").toLowerCase().includes(searchText) ||
      (item.region || "").toLowerCase().includes(searchText) ||
      (item.country || "").toLowerCase().includes(searchText) ||
      (item.hospital_services || "").toLowerCase().includes(searchText) ||
      (item.hospital_amenities || "").toLowerCase().includes(searchText) ||
      (item.pharmacy_services || "").toLowerCase().includes(searchText) ||
      (item.status || "").toLowerCase().includes(searchText)
    );
  });

  // Toggle selection of a row
  const handleSelect = (id) => {
    setSelectedIds((prevSelectedIds) =>
      prevSelectedIds.includes(id)
        ? prevSelectedIds.filter((itemId) => itemId !== id)
        : [...prevSelectedIds, id]
    );
  };

  // Handle delete action
  const handleDelete = async () => {
    const { error } = await supabase
      .from("healthcare_profiles")
      .delete()
      .in("id", selectedIds);

    if (error) {
      console.error("Error deleting data:", error);
    } else {
      setData((prevData) =>
        prevData.filter((item) => !selectedIds.includes(item.id))
      );
      setSelectedIds([]);
    }
  };

  // Handle edit action
  const handleEdit = (id) => {
    router.push(`/edit-facility-profile-form?id=${id}`);
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className=" md:mb-0 mb-3 w-full">Users Facilities</h6>
        <div className=" lg:space-x-3 sm:items-center justify-end flex max-sm:flex-col max-sm:justify-start max-lg:justify-between w-full max-lg:mt-5 rtl:space-x-reverse">
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          <div className="flex ">
          <Button
            icon="heroicons-outline:plus-sm"
            text="Add Facility"
            className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
            iconClass="text-lg"
            onClick={() => router.push("/facility-profile-form")}
          />
          <Button
            icon="heroicons-outline:trash"
            text="Delete Selected"
            className="btn-danger max-sm:text-xs font-normal btn-sm max-sm:mt-2"
            iconClass="text-lg"
            textClass="max-sm:text-xs"
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
          />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-medium text-gray-500">
              <th className="px-6 py-3">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    setSelectedIds(
                      e.target.checked ? data.map((item) => item.id) : []
                    );
                  }}
                  checked={selectedIds.length === data.length}
                />
              </th>
              <th className="px-6 py-3">Unique ID</th>
              <th className="px-6 py-3">Facility Type</th>
              <th className="px-6 py-3">Facility Name</th>
              <th className="px-6 py-3">Contact Number</th>
              <th className="px-6 py-3">Whatsapp</th>
              <th className="px-6 py-3">GPS Address</th>
              <th className="px-6 py-3">Street</th>
              <th className="px-6 py-3">Post Code</th>
              <th className="px-6 py-3">Area</th>
              <th className="px-6 py-3">District</th>
              <th className="px-6 py-3">Region</th>
              <th className="px-6 py-3">Country</th>
              <th className="px-6 py-3">Hospital Services</th>
              <th className="px-6 py-3">Hospital Amenities</th>
              <th className="px-6 py-3">Pharmacy Services</th>
              <th className="px-6 py-3">Created At</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleSelect(item.id)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.unique_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.facility_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.facility_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.contact_num}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{item.whatsapp}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.gps_address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{item.street}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.post_code}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.area}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.district}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.region}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.country}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.hospital_services}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.hospital_amenities}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.pharmacy_services}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(item.created_at)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap ${item.status === 'Active'? 'text-green-600': 'text-red-600'}`}>{item.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <Button
                    icon="heroicons-outline:pencil-alt"
                    iconClass="text-base text-gray-600" // Adjust the color and size as needed
                    className="p-0 bg-transparent border-none" // No padding, transparent background, no border
                    onClick={() => handleEdit(item.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
