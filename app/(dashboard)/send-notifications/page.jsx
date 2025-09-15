"use client";
import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { districts_regions } from "@/constant/ghana_regions_districts_coordinates";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { supabase } from "@/app/utils/supabaseClient";
import moment from "moment";
import Checkbox from "@/components/ui/Checkbox";
import { toast, ToastContainer } from "react-toastify";
import { useSearchParams } from "next/navigation";

const SendNotifications = () => {
  const [user, setUser] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regions] = useState(districts_regions.data);
  const Genders = ["Male", "Female"];
  const ageRanges = ["All", "18-24", "25-34", "35-44", "45-54", "55-Above"];
  const searchparams = useSearchParams();
  const id = searchparams.get("id");

  const schema = yup.object({
    title: yup.string().required("Title is required"),
    description: yup.string().required("Description is required"),
    region: yup.string().when("isTrackerNotification", {
      is: false,
      then: (schema) => schema.required("Region is required"),
    }),
    sex: yup.string().when("isTrackerNotification", {
      is: false,
      then: (schema) => schema.required("Gender is required"),
    }),
    age: yup.string().when("isTrackerNotification", {
      is: false,
      then: (schema) => schema.required("Age is required"),
    }),
    isTrackerNotification: yup.boolean().default(false),
  });

  const {
    register,
    formState: { errors },
    handleSubmit,
    setValue,
    trigger,
    reset,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onTouched",
    defaultValues: {
      isTrackerNotification: false, // Initialize checkbox state
    },
  });

  const isTrackerNotification = watch("isTrackerNotification");

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from("notification_list")
          .select("title, description, sex, region, age_range")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data) {
          // Set form values with fetched data
          setValue("title", data.title);
          setValue("description", data.description);
          setValue("region", data.region);
          setValue("sex", data.sex);
          setValue("age", data.age_range);

          // Determine if it's a tracker notification
          const isTracker = !data.region && !data.sex && !data.age_range;
          setValue("isTrackerNotification", isTracker);
        }
      } catch (error) {
        console.error("Error fetching notifications", error);
      }
    };

    fetchNotifications();
  }, [id, setValue]); // Add setValue to dependencies

  const handleSendNotification = async (data) => {
    setLoading(true);
    try {
      if (id) {
        // Update existing notification
        await supabase
          .from("notification_list")
          .update({
            title: data.title,
            description: data.description,
            region: data.region,
            sex: data.sex,
            age_range: data.age,
            updated_at: moment(new Date()).valueOf(),
          })
          .eq("id", id);
      } else {
        // Existing create logic
        if (data.isTrackerNotification) {
          await sendTrackerNotification(data);
        } else {
          await fetchUsers(data);
        }
      }
      reset();
    } catch (error) {
      console.error("Error sending notification:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (data) => {
    const { region, sex, age } = data;
    console.log("age", age);

    let query = supabase.from("user_profiles").select("fcm_token, id");
    if (region) {
      query = query.eq("region", region);
    }
    if (sex) {
      query = query.eq("sex", sex);
    }
    if (age && age !== "All") {
      const currentYear = new Date().getFullYear();
      let minYear, maxYear;
      if (age === "55-Above") {
        maxYear = currentYear - 55;
        query = query.lte("dob", `${maxYear}-12-31`);
        console.log(`DOB range for 55-Above: <= ${maxYear}-12-31`);
      } else {
        const [minAge, maxAge] = age.split("-").map(Number);
        minYear = currentYear - maxAge;
        maxYear = currentYear - minAge;
        query = query
          .gte("dob", `${minYear}-01-01`)
          .lte("dob", `${maxYear}-12-30`);
        console.log(
          `DOB range for ${age}: ${minYear}-01-01 to ${maxYear}-12-31`
        );
      }
    }

    const { data: users, error } = await query;

    const response = await fetch("/api/send-notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data?.title,
        description: data?.description,
        sex: data?.sex,
        ageRange: data?.age,
        region: data?.region,
      }),
    });

    const result = await response.json();
    console.log(`Notification sent to ${user.id}:`, result);
    const insertRecords = users.map((user) => ({
      created_at: moment(new Date()).valueOf(),
      updated_at: moment(new Date()).valueOf(),
      is_seen: false,
      title: data?.title,
      body: data?.description,
      type: "user-grouping",
      screen: "",
      user_id: user?.id,
    }));
    await supabase.from("notifications").insert(insertRecords);
    await supabase.from("notification_list").insert([
      {
        created_at: moment(new Date()).valueOf(),
        updated_at: moment(new Date()).valueOf(),
        title: data?.title,
        description: data?.description,
        region: data?.region,
        sex: data?.sex,
        age_range: data?.age,
        user_id: userId,
      },
    ]);

    toast.success("Notification sent successfully");

    if (error) {
      console.error("Error fetching users:", error);
    } else {// Debugging output
      setUser(users);
    }
  };

  const sendTrackerNotification = async (data) => {
    await fetch("/api/send-tracker-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data?.title,
        description: data?.description,
      }),
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("user_id");
      if (storedUserId) {
        setUserId(storedUserId);
      }
    }
  }, []);

  const handleSelectChange = (field) => (e) => {
    setValue(field, e.target.value);
    trigger(field);
  };

  const handleCheckboxChange = (e) => {
    setValue("isTrackerNotification", e.target.checked);
    trigger(["region", "sex", "age"]); // Explicitly trigger validation for conditional fields
  };

  return (
    <div>
      <form onSubmit={handleSubmit(handleSendNotification)}>
        <ToastContainer />
        <Card title="Send Notification" className="mt-5 ">
          <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
            <div className="text-sm">
              <div>
                <div className="lg:col-span-2 col-span-1">
                  <label className="block text-sm mb-2 font-medium text-gray-700 dark:text-slate-200">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Your Title"
                    {...register("title")}
                    className={`w-full dark:bg-slate-800 p-2 text-sm border rounded-md focus:ring-black-300 ${
                      loading ? "border-gray-100" : "border-gray-300"
                    }`}
                    disabled={loading}
                  />
                  {errors.title && (
                    <p className="text-red-500 mt-1 text-sm mb-2">
                      *{errors?.title?.message}
                    </p>
                  )}
                </div>
                <div className="lg:col-span-2 col-span-1">
                  <label className="block text-sm my-2 font-medium text-gray-700 dark:text-slate-200 mt-2">
                    Description
                  </label>
                  <textarea
                    type="text"
                    placeholder="Enter Your Description"
                    {...register("description")}
                    rows={2}
                    className={`w-full p-2 border dark:bg-slate-800 rounded-md focus:ring-black-300 resize-none ${
                      loading ? "border-gray-100" : "border-gray-300"
                    }`}
                    disabled={loading}
                  />
                  {errors.description && (
                    <p className="text-red-500 mt-1 text-sm">
                      *{errors?.description?.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-base my-4">Targeting Options</h4>
                <Checkbox
                  activeClass="ring-black-500 bg-black-500"
                  label="Period tracker notifications enabled?"
                  value={isTrackerNotification}
                  {...register("isTrackerNotification")}
                  onChange={handleCheckboxChange}
                />
                <div className="flex flex-col my-2">
                  {/* Region Selection */}
                  <span className="text-sm mb-2">Select Region</span>
                  <select
                    {...register("region")}
                    onChange={handleSelectChange("region")}
                    className="border dark:bg-slate-800 rounded-md px-3 py-2 w-full"
                    disabled={isTrackerNotification && loading}
                  >
                    <option value="">Select Region</option>
                    {regions.map((region) => (
                      <option key={region.name} value={region.name}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                  {errors.region && (
                    <p className="text-red-500 mt-1 text-sm mb-2">
                      *{errors.region.message}
                    </p>
                  )}

                  {/* Gender Selection */}
                  <span className="text-sm my-2">Select Gender</span>
                  <select
                    {...register("sex")}
                    onChange={handleSelectChange("sex")}
                    className="border dark:bg-slate-800 rounded-md px-3 py-2 w-full"
                    disabled={loading && isTrackerNotification}
                  >
                    <option value="">Select Gender</option>
                    {Genders.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                  {errors.sex && (
                    <p className="text-red-500 mt-1 text-sm mb-2">
                      *{errors.sex.message}
                    </p>
                  )}

                  {/* Age Range Selection */}
                  <span className="text-sm my-2">Select Age</span>
                  <select
                    {...register("age")}
                    onChange={handleSelectChange("age")}
                    className="border dark:bg-slate-800 rounded-md px-3 py-2 w-full"
                    disabled={loading && isTrackerNotification}
                  >
                    <option value="">Select Age</option>
                    {ageRanges.map((age) => (
                      <option key={age} value={age}>
                        {age === "55-Above" ? "55+" : age}
                      </option>
                    ))}
                  </select>
                  {errors.age && (
                    <p className="text-red-500 mt-1 text-sm">
                      *{errors.age.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 space-x-3 rtl:space-x-reverse relative">
            {loading || (loading && isTrackerNotification) ? (
              <div className="w-7 h-7 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
            ) : (
              <Button
                text="Send Notification"
                className="btn-dark"
                type="submit"
                disabled={loading}
              />
            )}
          </div>
        </Card>
      </form>
    </div>
  );
};

export default SendNotifications;
