"use client";
import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { districts_regions } from "@/constant/ghana_regions_districts_coordinates";
import * as yup from 'yup';
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { supabase } from "@/app/utils/supabaseClient";
import moment from "moment";

const SendNotifications = () => {
  const [user, setUser] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regions] = useState(districts_regions.data);
  const Genders = ["Male", "Female"];
  const ageRanges = ["All", "18-24", "25-34", "35-44", "45-54", "55+"];

  const schema = yup.object({
    title: yup.string().required('title is required'),
    description: yup.string().required('description is required'),
    region: yup.string().required('region is required'),
    sex: yup.string().required('gender is required'),
    age: yup.string().required('age is required'),
  }).required();

  const {
    register,
    formState: { errors },
    handleSubmit,
    setValue,
    trigger,
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onTouched",
  });

  const handleSendNotification = async (data) => {
    setLoading(true);
    await fetchUsers(data);
    reset();
    setLoading(false);
  };

  const fetchUsers = async (data) => {
    const { region, sex, age } = data;
    console.log('age', age);
    
    let query = supabase.from('user_profiles').select('fcm_token, id');
    if (region) {
      query = query.eq('region', region);
    }
    if (sex) {
      query = query.eq('sex', sex);
    }
    if (age && age !== "All") {
      const currentYear = new Date().getFullYear();
      let minYear, maxYear;
      if (age === "55+") {
        maxYear = currentYear - 55;
        query = query.lte('dob', `${maxYear}-12-31`);
        console.log(`DOB range for 55+: <= ${maxYear}-12-31`);
      } else {
        const [minAge, maxAge] = age.split('-').map(Number);
        minYear = currentYear - maxAge;
        maxYear = currentYear - minAge;
        query = query
          .gte('dob', `${minYear}-01-01`)
          .lte('dob', `${maxYear}-12-30`);
        console.log(`DOB range for ${age}: ${minYear}-01-01 to ${maxYear}-12-31`);
      }
    }

    const { data: users, error } = await query;
    console.log('users', users);
    
    for(const user of users){
        try {
            const response = await fetch('/api/send-notifications', {
                 method: 'POST',
                 headers: {
                   'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({
                   fcm_token: user?.fcm_token,
                   title: data?.title,
                   description: data?.description,
                 }),
               });
               const result = await response.json();
               console.log(`Notification sent to ${user.id}:`, result);
         } catch (error) {
             console.error(`Error sending notification to ${user.id}:`, err);
         }
     
         await supabase.from("notifications").insert([
           {
             created_at: moment(new Date()).valueOf(),
             updated_at: moment(new Date()).valueOf(),
             is_seen: false,
             title: data?.title,
             body: data?.description,
             type: "user-grouping",
             screen: "",
             user_id: user?.id,
           },
         ]);
         console.log('here is your id:', user?.id);
    }

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

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      console.log("Filtered Users:", users); // Debugging output
      setUser(users);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    }
  }, []);

  const handleSelectChange = (field) => (e) => {
    setValue(field, e.target.value);
    trigger(field);
  };

  return (
    <div>
      <form onSubmit={handleSubmit(handleSendNotification)}>
        <Card title="Send Notification">
          <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
            <div className="">
              <div>
                <div className="lg:col-span-2 col-span-1">
                  <label className="block text-md font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Your Title"
                    {...register("title")}
                    className={`w-full p-2 border rounded-sm focus:ring-black-300 ${loading ? 'border-gray-100' : 'border-gray-300'}`}
                    disabled={loading}
                  />
                  {errors.title && <p className="text-red-500 text-sm mb-2">*{errors?.title?.message}</p>}
                </div>
                <div className="lg:col-span-2 col-span-1">
                  <label className="block text-md font-medium text-gray-700 mt-2">
                    Description
                  </label>
                  <textarea
                    type="text"
                    placeholder="Enter Your description"
                    {...register("description")}
                    rows={2}
                    className={`w-full p-2 border rounded-sm focus:ring-black-300 resize-none ${loading ? 'border-gray-100' : 'border-gray-300'}`}
                    disabled={loading}
                  />
                  {errors.description && <p className="text-red-500 text-sm">*{errors?.description?.message}</p>}
                </div>
              </div>
              <div>
                <h4 className="text-lg my-4">Targeting Options</h4>
                <div className="flex flex-col">
                  {/* Region Selection */}
                  <span className="text-md font-bold">Select Region</span>
                  <select
                    {...register("region")}
                    onChange={handleSelectChange("region")}
                    className="border rounded-sm px-3 py-2 w-full"
                    disabled={loading}
                  >
                    <option value="">Select Region</option>
                    {regions.map((region) => (
                      <option key={region.name} value={region.name}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                  {errors.region && <p className="text-red-500 text-sm mb-2">*{errors.region.message}</p>}

                  {/* Gender Selection */}
                  <span className="text-md font-bold mt-2">Select Gender</span>
                  <select
                    {...register("sex")}
                    onChange={handleSelectChange("sex")}
                    className="border rounded-sm px-3 py-2 w-full"
                    disabled={loading}
                  >
                    <option value="">Select Gender</option>
                    {Genders.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                  {errors.sex && <p className="text-red-500 text-sm mb-2">*{errors.sex.message}</p>}

                  {/* Age Range Selection */}
                  <span className="text-md font-bold mt-2">Select Age</span>
                  <select
                    {...register("age")}
                    onChange={handleSelectChange("age")}
                    className="border rounded-sm px-3 py-2 w-full"
                    disabled={loading}
                  >
                    <option value="">Select Age</option>
                    {ageRanges.map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>
                  {errors.age && <p className="text-red-500 text-sm">*{errors.age.message}</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 space-x-3 rtl:space-x-reverse relative">
            {loading ? (
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
