"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import Card from "@/components/ui/Card";
import { formatDate } from "@/app/utils/helpers";
import Button from "@/components/ui/Button";
import Loading from "@/components/Loading";
import UserActivity from "./UsersActivity";
import { userDetailsFields } from "@/constant/facility-labels-data";

export default function ViewUserDetails() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();

  const from = searchParams.get("from");

  // Extract ID from query parameters
  const id = searchParams.get("id");

  const [user, setUser] = useState();

  useEffect(() => {
    const fetchUserRole = async () => {
      const userId = localStorage.getItem("user_id"); // assuming user_id is stored in localStorage
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
        } else {
          setUser(data);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    fetchUserRole();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching facility data:", error);
        setError(error.message);
      } else {
        setUserData(data);
        console.log(data);
      }
      setLoading(false);
    };

    fetchUser();
  }, [id]);

  if (loading)
    return (
      <div>
        <Loading />
      </div>
    );
  if (error) return <div>Error: {error}</div>;

  //   const handleEdit = (id) => {
  //     router.push(`/edit-facility-profile-form?id=${id}`);
  //   };

  return (
    <Card
      className="min-h-[80vh] bg-white"
      title={`${userData.first_name} ${userData.last_name}`}
      headerslot={
        <Button
          icon="heroicons-outline:arrow-left"
          text="Back"
          className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
          iconClass="text-lg"
          onClick={() =>
            router.push(
              from === "delete-request-account"
                ? "/delete-account-request"
                : "/users"
            )
          }
        />
      }
    >
      <div className="grid grid-cols-1 gap-2 sm:text-sm text-xs text-gray-600 xl:w-[40%] lg:w-[50%] capitalize">
        {userDetailsFields.map(({ label, key, format }) => (
          <div className="flex" key={key}>
            <div className="w-1/3 text-gray-900">{label}</div>
            <div className={`w-2/3 ${key === "email" ? "lowercase" : ""}`}>
              {userData[key]
                ? format
                  ? format(userData[key])
                  : userData[key]
                : "Not Available"}
            </div>
          </div>
        ))}

        <div className="flex">
          <div className="w-1/3 text-gray-900">Status</div>
          <div className="w-2/3">
            {userData.status === true ? (
              <div className="flex items-center">
                <p className="bg-green-100 text-green-500 px-4 py-1 rounded-full flex items-center text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>{" "}
                  Active
                </p>
              </div>
            ) : (
              <div className="flex items-center">
                <p className="bg-yellow-100 text-yellow-500 px-4 py-1 rounded-full flex items-center text-sm">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>{" "}
                  Inactive
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {user?.role === "Super Admin" && (
        <UserActivity user={`${userData?.first_name} ${userData?.last_name}`} />
      )}
    </Card>
  );
}
