"use client";
import {
  deletePeriodTrackerLog,
  getPeriodTrackerLogs,
} from "@/app/services/period_tracker_service";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icons from "@/components/ui/Icon";
import moment from "moment";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const PeriodsTrackerPage = () => {
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showFertileWindow, setShowFertileWindow] = useState(false);
  const [showFlowTypes, setShowFlowTypes] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const itemsPerPage = 30;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    const { data, error } = await getPeriodTrackerLogs();
    if (data) {
      setLogs(data);
      console.log(JSON.stringify(data, null, 2));

      setTotalPages(Math.ceil(data.length / itemsPerPage));
    }
  };

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let timeout;
    const onScroll = () => {
      container.classList.add("scrolling");
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        container.classList.remove("scrolling");
      }, 300); // Remove after 300ms of no scroll events
    };

    container.addEventListener("scroll", onScroll);
    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(timeout);
    };
  }, []);

  const dataa = [
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
    {
      id: 112,
      created_at: 1739968222403,
      goal: "track my cycle",
      cycle_length: 22,
      period_length: 3,
      is_consistent: "yes",
      period_start_date: "2025-03-16",
      flow_types: [
        {
          date: "2025-03-16",
          selectedFlow: "heavy",
        },
        {
          date: "2025-03-17",
          selectedFlow: "light",
        },
        {
          date: "2025-03-18",
          selectedFlow: "super heavy",
        },
      ],
      next_reminder: "2025-04-10",
      next_reminder_utc: "2025-04-10",
      period_start_date_utc: "2025-03-16",
      updated_at: 1742086085314,
      updated_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      created_by: "707cc7d3-30a8-4ead-a495-f449a1881087",
      user_id: "707cc7d3-30a8-4ead-a495-f449a1881087",
      is_created_by_admin_panel: false,
      ovulation_date: "2025-03-02",
      ovulation_date_utc: "2025-03-02",
      fertile_window_dates: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      fertile_window_dates_utc: [
        "2025-02-28",
        "2025-03-01",
        "2025-03-02",
        "2025-03-03",
        "2025-03-04",
      ],
      user_profiles: {
        dob: "2025-02-21",
        email: "test@gmail.com",
        region: "Upper East",
        last_name: "user",
        avatar_url:
          "https://bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/object/public/avatar/6cec4106-a8c7-4829-89b6-6101921ea6d4.jpg",
        first_name: "test",
        phone_number: "123456789",
        is_tracker_notifications_enabled: true,
      },
    },
  ];

  // Update the handleEdit function in overview/page.jsx
  const handleEdit = (item) => {
    const encodedItem = encodeURIComponent(JSON.stringify(item));
    router.push(`/categories/period_tracker/create?item=${encodedItem}`);
  };

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return logs.slice(startIndex, endIndex);
  };

  const deleteItem = async (id) => {
    try {
      const { error } = await deletePeriodTrackerLog(id);
      if (error) throw error;

      // Close modal and refresh data
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchLogs();
      toast.success("Period tracker deleted successfully");
    } catch (error) {
      console.error("Error deleting period tracker:", error);
      toast.error("Failed to delete period tracker");
    }
  };

  const deleteModal = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  return (
    <div className="">
      <div className="mt-8 relative">
        <Card
          title="Periods Tracker"
          className="bg-white dark:bg-slate-800 overflow-hidden"
          bodyClass="p-0"
        >
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto relative hidden-scrollbar"
          >
            <table className="min-w-full divide-y divide-gray-200 ">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Goal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Cycle Length
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Period Length
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Consistent?
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Period Start
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Next Reminder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Ovulation Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Fertile Window
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Flow Types
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {log.user_profiles?.avatar_url ? (
                            <Image
                              className="h-10 w-10 rounded-full"
                              src={log.user_profiles.avatar_url}
                              alt=""
                              width={40}
                              height={40}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <Icon
                                icon="heroicons:user"
                                className="h-6 w-6 text-gray-500"
                              />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {log.user_profiles?.first_name}{" "}
                            {log.user_profiles?.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.user_profiles?.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.user_profiles?.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.user_profiles?.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.goal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.cycle_length} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.period_length} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.is_consistent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {moment(log.period_start_date).format("MMM DD, YYYY")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {moment(log.next_reminder).format("MMM DD, YYYY")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {moment(log.ovulation_date).format("MMM DD, YYYY")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        iconWidth={24}
                        text="Fertile Window"
                        icon="healthicons:sexual-reproductive-health"
                        iconClass="text-white w-4 h-4 shrink-0"
                        className="bg-[#9333ea] text-white rounded-md p-2 text-sm hover:bg-[#651da8] transition-colors w-full whitespace-nowrap flex items-center justify-center gap-2"
                        onClick={() => {
                          setSelectedLog(log);
                          setShowFertileWindow(true);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        text="Flow Types"
                        icon="bi:droplet-fill"
                        iconClass="text-white w-4 h-4 shrink-0"
                        className="bg-[#dc2626] text-white rounded-md p-2 text-sm hover:bg-[#a91f1f] transition-colors w-full whitespace-nowrap flex items-center justify-center gap-2"
                        onClick={() => {
                          setSelectedLog(log);
                          setShowFlowTypes(true);
                        }}
                      />
                    </td>
                    <td className="text-center gap-2">
                      <div className="flex justify-center items-center gap-4">
                        <Button
                          icon="heroicons-outline:pencil-alt"
                          iconClass="text-blue-500 text-2xl"
                          className="p-0 bg-transparent border-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(log);
                          }}
                        />
                        <Button
                          icon="bi:trash"
                          iconClass="text-red-500 text-2xl"
                          className="p-0 bg-transparent border-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteModal(log);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Delte Modal */}
        <Modal
          title="Delete Period Tracker"
          titleClass="text-white text-lg"
          activeModal={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
          centered
          themeClass="bg-red-500"
        >
          <div className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-40 h-40 rounded-full bg-red-100 flex items-center justify-center">
                <Icon
                  icon="heroicons:exclamation-triangle"
                  className="w-24 h-24 text-red-500"
                />
              </div>
              <p className="text-center text-gray-700 dark:text-gray-300">
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {itemToDelete?.user_profiles?.first_name}{" "}
                  {itemToDelete?.user_profiles?.last_name}
                </span>
                's period tracker?
              </p>
              <div className="flex gap-3 mt-4 w-full">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-[#56ce84] text-white rounded-md hover:bg-[#46b276] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteItem(itemToDelete?.id)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Fertile Window Modal */}
        <Modal
          titleClass="text-white text-lg"
          title="Fertile Window Dates:"
          activeModal={showFertileWindow}
          onClose={() => setShowFertileWindow(false)}
          centered
          themeClass="bg-[#4ab573]"
        >
          <div className="p-4">
            <Calendar
              value={
                selectedLog?.fertile_window_dates?.length
                  ? new Date(selectedLog.fertile_window_dates[0])
                  : selectedLog?.period_start_date
                  ? new Date(selectedLog.period_start_date)
                  : new Date()
              }
              className="custom-calendar"
              selectRange={false}
              showNeighboringMonth={true}
              tileClassName={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                // Add position-relative class to all tiles for proper dot positioning
                let classes = "position-relative m-1";

                if (selectedLog?.fertile_window_dates?.includes(dateString)) {
                  classes += " fertile-date";
                }

                return classes;
              }}
              tileContent={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                if (selectedLog?.fertile_window_dates?.includes(dateString)) {
                  return (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#9333ea",
                        borderRadius: "50%",
                      }}
                    ></div>
                  );
                }
                return null;
              }}
            />
            <div className="mt-3 flex items-center">
              <div className="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
              <span className="text-sm">Fertile Window Days</span>
            </div>

            {/* Add custom styles to fix all the issues */}
            <style jsx global>{`
              /* Fix weekend colors */
              .custom-calendar .react-calendar__month-view__days__day--weekend {
                color: black !important;
              }

              /* Basic tile styling */
              .custom-calendar .react-calendar__tile {
                margin: 2px;
                border-radius: 4px;
                position: relative !important;
                height: 40px;
                background: none;
              }

              /* Fertility day styling */
              .custom-calendar .fertile-date {
                background-color: rgba(168, 85, 247, 0.2) !important;
              }

              /* Reset today's special styling */
              .custom-calendar .react-calendar__tile--now {
                background: inherit !important;
                color: inherit !important;
              }

              /* Reset active/selected date styling */
              .custom-calendar .react-calendar__tile--active,
              .custom-calendar .react-calendar__tile--hasActive {
                background: inherit !important;
                color: inherit !important;
              }

              /* Apply fertility styling even when active/hover */
              .custom-calendar .fertile-date:hover,
              .custom-calendar .fertile-date:focus,
              .custom-calendar .fertile-date.react-calendar__tile--active {
                background-color: rgba(168, 85, 247, 0.3) !important;
              }

              .position-relative {
                position: relative !important;
              }

              /* Fix for Sunday display */
              .custom-calendar .react-calendar__month-view__days {
                display: grid !important;
                grid-template-columns: repeat(7, 1fr);
              }

              /* Ensure all days are visible */
              .custom-calendar .react-calendar__month-view__days__day {
                display: flex !important;
                justify-content: center;
                align-items: center;
              }

              /* Reset today's styling more aggressively */
              .custom-calendar .react-calendar__tile--now {
                background: inherit !important;
                color: inherit !important;
                border: none !important;
                outline: none !important;
              }

              /* Force fertility styles to override when on today's date */
              .custom-calendar .react-calendar__tile--now.fertile-date {
                background-color: rgba(168, 85, 247, 0.2) !important;
              }

              /* Force flow styles to override when on today's date */
              .custom-calendar .react-calendar__tile--now.flow-date {
                background-color: rgba(220, 38, 38, 0.15) !important;
              }

              /* Ensure dots remain visible on today's date */
              .custom-calendar .react-calendar__tile--now .dot-indicator {
                display: block !important;
              }
            `}</style>
          </div>
        </Modal>

        {/* Flow Types Modal */}
        <Modal
          titleClass="text-white text-lg"
          themeClass="bg-[#4ab573]"
          title="Flow Types by Date:"
          activeModal={showFlowTypes}
          onClose={() => setShowFlowTypes(false)}
          centered
        >
          <div className="p-4">
            <Calendar
              value={
                selectedLog?.flow_types?.length
                  ? new Date(selectedLog.flow_types[0].date)
                  : selectedLog?.period_start_date
                  ? new Date(selectedLog.period_start_date)
                  : new Date()
              }
              className="custom-calendar"
              selectRange={false}
              showNeighboringMonth={true}
              tileClassName={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                // Add position-relative class to all tiles for proper dot positioning
                let classes = "position-relative m-1";

                // Check if it's a flow date
                const hasFlow = selectedLog?.flow_types?.some(
                  (f) => f.date === dateString
                );

                if (hasFlow) {
                  classes += " flow-date";
                }

                return classes;
              }}
              tileContent={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                const flow = selectedLog?.flow_types?.find(
                  (f) => f.date === dateString
                );

                if (flow) {
                  return (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#dc2626",
                        borderRadius: "50%",
                      }}
                    ></div>
                  );
                }
                return null;
              }}
            />
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
              <span className="text-sm">Period Flow Days</span>
            </div>
            <div
              className={`mt-3 grid md:grid-cols-${
                selectedLog?.flow_types?.length % 2 === 0 ? "2" : "3"
              } grid-cols-2 gap-2`}
            >
              {selectedLog?.flow_types?.map((flow) => (
                <div
                  key={flow.date}
                  className="mt-1 text-sm flex justify-start gap-2 col-span-1"
                >
                  <span>{moment(flow.date).format("MMM DD")}:</span>
                  <span className="font-semibold capitalize">
                    {flow.selectedFlow || "No Entry"}
                  </span>
                </div>
              ))}
            </div>

            {/* Add custom styles to fix all the issues */}
            <style jsx global>{`
              /* Fix weekend colors */
              .custom-calendar .react-calendar__month-view__days__day--weekend {
                color: black !important;
              }

              /* Basic tile styling */
              .custom-calendar .react-calendar__tile {
                margin: 2px;
                border-radius: 4px;
                position: relative !important;
                height: 40px;
                background: none;
              }

              /* Flow day styling */
              .custom-calendar .flow-date {
                background-color: rgba(220, 38, 38, 0.15) !important;
              }

              /* Reset today's special styling */
              .custom-calendar .react-calendar__tile--now {
                background: inherit !important;
                color: inherit !important;
              }

              /* Reset active/selected date styling */
              .custom-calendar .react-calendar__tile--active,
              .custom-calendar .react-calendar__tile--hasActive {
                background: inherit !important;
                color: inherit !important;
              }

              /* Apply flow styling even when active/hover */
              .custom-calendar .flow-date:hover,
              .custom-calendar .flow-date:focus,
              .custom-calendar .flow-date.react-calendar__tile--active {
                background-color: rgba(220, 38, 38, 0.25) !important;
              }

              .position-relative {
                position: relative !important;
              }

              /* Fix for Sunday display */
              .custom-calendar .react-calendar__month-view__days {
                display: grid !important;
                grid-template-columns: repeat(7, 1fr);
              }

              /* Ensure all days are visible */
              .custom-calendar .react-calendar__month-view__days__day {
                display: flex !important;
                justify-content: center;
                align-items: center;
              }

              /* Reset today's styling more aggressively */
              .custom-calendar .react-calendar__tile--now {
                background: inherit !important;
                color: inherit !important;
                border: none !important;
                outline: none !important;
              }

              /* Force fertility styles to override when on today's date */
              .custom-calendar .react-calendar__tile--now.fertile-date {
                background-color: rgba(168, 85, 247, 0.2) !important;
              }

              /* Force flow styles to override when on today's date */
              .custom-calendar .react-calendar__tile--now.flow-date {
                background-color: rgba(220, 38, 38, 0.15) !important;
              }

              /* Ensure dots remain visible on today's date */
              .custom-calendar .react-calendar__tile--now .dot-indicator {
                display: block !important;
              }
            `}</style>
          </div>
        </Modal>
      </div>
      {totalPages > 0 && (
        <div className="flex justify-end items-center m-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default PeriodsTrackerPage;
