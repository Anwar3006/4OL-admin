import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Textinput from "@/components/ui/Textinput";
import SplitDropdown2 from "@/components/ui/Split-Dropdown2";
import Loading from "@/components/Loading";
import { getProfileById, updateProfileById } from "@/actions/user.actions";

const EditUserProfile = () => {
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
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
  } = useForm();

  const selectedRole = watch("role");
  const selectedSex = watch("sex");

  useEffect(() => {
    if (id) {
      const fetchUserData = async () => {
        try {
          const { data, error } = await getProfileById(id);
  
          if (error) throw new Error(error);
  
          setUserData(data);
          console.log("Fetched data:", data);
  
          // Format dob to just YYYY-MM-DD
          const formattedDob = data.dob ? new Date(data.dob).toISOString().split("T")[0] : "";
          
          // Populate form with existing data
          Object.keys(data).forEach((key) => {
            if (key === 'dob') {
              setValue(key, formattedDob);
            } else {
              setValue(key, data[key]);
            }
          });
        } catch (error) {
          console.error("Error fetching data:", error);
          toast.error("Failed to fetch data: " + error.message);
        }
      };
  
      fetchUserData();
    }
  }, [id, setValue]);
  

  const onSubmit = async (formData) => {
    setLoading(true);
  
    try {
      const { error } = await updateProfileById(id, formData);
  
      if (error) throw new Error(error);
  
      toast.success("Data updated successfully");
      router.push("/admin");
    } catch (error) {
      console.error("Error updating data:", error);
      toast.error("Failed to update data: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  

  if (!id) return <p className="w-full mx-auto"><Loading /></p>;

  return (
    <form className="w-full grid grid-cols-1 lg:grid-cols-2 sm:gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Textinput
        name="first_name"
        label="First Name"
        type="text"
        placeholder="First Name"
        register={register}
        error={errors.first_name?.message}
        className='mb-2 capitalize'
      />

      <Textinput
        name="last_name"
        label="Last Name"
        type="text"
        placeholder="Last Name"
        register={register}
        error={errors.last_name?.message}
        className='mb-2 capitalize'
      />

      <SplitDropdown2
        label="Sex"
        value={selectedSex}
        onChange={(value) => setValue('sex', value)}
        className="mb-4 w-full text-sm"
        inputClass='hidden capitalize'
      />

      <Textinput
        name="dob"
        label="Date of Birth"
        type="date"
        placeholder="Date of Birth"
        register={register}
        error={errors.dob?.message}
        className='mb-2'
      />

      <Textinput
        name="email"
        label="Email"
        type="email"
        placeholder="Enter your email"
        register={register}
        error={errors.email?.message}
        className='mb-2'
      />

      <Textinput
        name="phone_number"
        label="Phone Number"
        type="tel"
        placeholder="Enter your phone number"
        register={register}
        error={errors.phone_number?.message}
        className='mb-2'
      />

      <SplitDropdown2
        label="Role"
        value={selectedRole}
        items={[{label: 'Super Admin'}, {label: 'Admin'}]}
        onChange={(value) => setValue('role', value)}
        className="mb-4 w-full"
        inputClass='hidden capitalize'
      />

      <button type="submit" disabled={loading} className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full">
        {loading ? 'Updating...' : 'Update'}
      </button>
    </form>
  );
};

export default EditUserProfile;
