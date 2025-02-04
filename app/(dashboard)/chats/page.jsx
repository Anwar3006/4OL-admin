"use client";
import React, { useState, useEffect, useRef } from 'react';
import { FaTicketAlt, FaHourglassStart, FaLock, FaTrash, FaEllipsisH, FaEdit } from "react-icons/fa";
import { supabase } from '@/app/utils/supabaseClient';
import moment from 'moment';
import PaginationNew from '@/components/ui/PaginationNew';
import TicketTable from './TicketModal';
import { toast } from 'react-toastify';

export default function ChatPage() {
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0, height: 0 });
  const [data, setData] = useState([] || null);
  const [dataCount, setDataCount] = useState({
    totalTickets: 0, pendingTickets: 0, closedTickets: 0, deletedTickets: 0
  });
  const [pageIndex, setPageIndex] = useState(0); // Pagination index
  const [pageSize] = useState(10); // Items per page
  const [totalPages, setTotalPages] = useState(0); // Total pages for pagination
  const modalRef = useRef(null);

  const TicketCards = [
    { tickets: 'Total Tickets', count: dataCount.totalTickets, icon: <FaTicketAlt />, iconColor: 'blue', iconbgColor: 'bg-blue-100' },
    { tickets: 'Pending Tickets', count: dataCount.pendingTickets, icon: <FaHourglassStart />, iconColor: 'Goldenrod', iconbgColor: 'bg-yellow-100' },
    { tickets: 'Closed Tickets', count: dataCount.closedTickets, icon: <FaLock />, iconColor: 'green', iconbgColor: 'bg-green-100' },
    { tickets: 'Deleted Tickets', count: dataCount.deletedTickets, icon: <FaTrash />, iconColor: 'red', iconbgColor: 'bg-red-100' },
  ];

  const pageOptions = Array.from({ length: totalPages }, (_, i) => i);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageOptions.length - 1;

  const gotoPage = (index) => setPageIndex(index);
  const previousPage = () => canPreviousPage && setPageIndex(pageIndex - 1);
  const nextPage = () => canNextPage && setPageIndex(pageIndex + 1);

  async function fetchData() {
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;
    setLoading(true);
    const { data, error, count } = await supabase
      .from('chat_support')
      .select('*, users:requested_by(avatar_url)', { count: "exact" }) // Fetch user details
      .eq('is_deleted', false)
      .order("created_at", { ascending: false })
      .range(from, to);
    console.log(data);
    setTotalPages(Math.ceil(count / pageSize));
    setData(data);
    setLoading(false);
    if (error) {
      console.error('Error fetching data:', error);
      return;
    }
  }

  async function fetchTicketsData() {
    const { data, error } = await supabase.from('chat_support').select('status,is_deleted');
    setLoading(true);
    if (error) {
      console.error('Error fetching ids', error);
      return;
    }
    console.log(data);
    setDataCount({
      totalTickets: data.length,
      pendingTickets: data.filter(item => item.status === "Open").length,
      closedTickets: data.filter(item => item.status === "Closed").length,
      deletedTickets: data.filter(item => item.is_deleted === true).length
    })
    setLoading(false);
  }

  const handleOpenModal = (event, id) => {
    const rect = event.target.getBoundingClientRect(); // Get the button's position
    const modalWidth = 160; // Modal width (adjust based on w-40 = 10rem)
    const modalHeight = 100;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    event.stopPropagation();

    let calculatedLeft = rect.left;
    let calculatedTop = rect.bottom;

    if (calculatedLeft + modalWidth > viewportWidth) {
      calculatedLeft = viewportWidth - modalWidth - 16;
    }
    if (calculatedTop + modalHeight > viewportHeight) {
      calculatedTop = rect.top - modalHeight;
    }
    setModalPosition({
      x: calculatedLeft,
      y: calculatedTop,
    });
    const ticket = data.find(item => item.id === id);
    setIsModalOpen(!isModalOpen);
    setSelectedTicketId(ticket);
  };

  const handleEditModal = () => {
    setModalVisible(true);
    setIsModalOpen(false);
  };

  const toggleModal = () => {
    setModalVisible(false);
  }

  const toggleDeleteModal = () => {
    setDeleteModal(!deleteModal);
    setIsModalOpen(false);
  }

  const handleDelete = async () => {
    setLoading(true);
    setDataCount((prev) => ({
      ...prev,
      deletedTickets: prev.deletedTickets + 1
    }));
    if (!selectedTicketId) {
      console.error('No id selected', error);
      return;
    }
    const { error } = await supabase
      .from('chat_support')
      .update({ is_deleted: true })
      .eq('id', selectedTicketId.id);
    if (error) {
      console.log('Error deleting entry', error);
      fetchTicketsData();
    } else {
      setData(prevData => prevData.filter(item => item.id !== selectedTicketId.id));
    }
    setIsModalOpen(false);
    setLoading(false);
    toggleDeleteModal();
    toast.success("Deleted successfully", {
      position: "top-right",
      autoClose: 1500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "light",
    });
  };

  useEffect(() => {
    fetchData();
    fetchTicketsData();
  }, [pageIndex, pageSize]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  return (
    <div className="min-h-screen bg-white flex flex-col p-[1%]">
      {/* Summary Data Section */}
      <div className="p-[1.3%] flex gap-[1%] w-full overflow-x-auto">
        {loading ? (
          <div className='w-full flex flex-col items-center justify-center'>
            <LoadingComponent />
          </div>
        ) : (
          TicketCards.map((label, index) => (
            <div key={index} className="flex flex-row justify-start items-center px-[4%] py-[1.5%] bg-gray-100 rounded-lg w-[100%] hover:bg-gray-50">
              {/* Icon on the left */}
              <div className={`flex justify-center items-center w-12 h-12 rounded-full ${label.iconbgColor}`}>
                <span className="text-2xl" style={{ color: label.iconColor }}>{label.icon}</span>
              </div>
              {/* Text Content */}
              <div className="ml-[4%]">
                <h2 className="text-2xl font-bold">{label.count}</h2>
                <p className="text-gray-500">{label.tickets}</p>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Table Section */}
      <div className="w-full px-[1%] overflow-x-auto h-full">
        {loading ? (
          <div className='flex items-center justify-center h-48'>
            <LoadingComponent />
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className="w-full bg-white rounded-lg overflow-hidden border border-gray-200 divide-y divide-gray-200 min-w-max">
            <thead className="bg-gray-100">
              <tr className="text-left text-black border-b text-sm sm:text-base">
                <th className="p-[1%] whitespace-nowrap">ID</th>
                <th className="p-[1%] whitespace-nowrap">Request By</th>
                <th className="p-[1%] whitespace-nowrap">Subject</th>
                <th className="p-[1%] text-wrap max-w-[150px] sm:max-w-none">Message</th>
                <th className="p-[1%] whitespace-nowrap">Priority</th>
                <th className="p-[1%] whitespace-nowrap">Status</th>
                <th className="p-[1%] whitespace-nowrap">Created At</th>
                <th className="p-[1%] whitespace-nowrap">Updated At</th>
                <th className="p-[1%] whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {data.map((ticket, index) => (
                <tr key={index} className="border-b hover:bg-gray-50 text-sm sm:text-base">
                  <td className="text-gray-500 px-3 py-[1%] whitespace-nowrap">#{ticket.id}</td>
                  {/* Request By Column */}
                  <td className="flex items-center space-x-3 text-gray-500 py-[6%] pl-4">
                    <img
                      src={ticket?.users?.avatar_url || '/assets/images/chat/chat-4.png'}
                      alt="User Avatar"
                      className="w-8 h-8 rounded-full"
                    />
                    <span className='ml-[6%] hidden sm:block'>{ticket.user_name}</span>
                  </td>
                  <td className="text-gray-500 max-w-[120px] sm:max-w-none truncate">{ticket.subject}</td>
                  {/* Message Column */}
                  <td className="text-gray-500 max-w-[150px] sm:max-w-none truncate overflow-hidden">{ticket.message}</td>
                  <td>
                    <span
                      className={`px-[10%] py-[6%] text-xs sm:text-sm rounded-full ${ticket.priority === "High"
                        ? "text-red-500 font-bold bg-red-100"
                        : ticket.priority === "Medium"
                          ? "text-yellow-500 font-bold bg-yellow-100"
                          : "text-cyan-500 font-bold bg-cyan-100"
                        }`}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`px-[10%] py-[6%] text-xs sm:text-sm rounded-full ${ticket.status === "Open"
                        ? 'bg-green-100 text-green-500 font-bold'
                        : 'bg-gray-200 text-gray-700 font-bold'
                        }`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{moment(ticket.created_at).format('DD/MM/YYYY')}</td>
                  <td className="text-gray-500 whitespace-nowrap">{moment(ticket.updated_at).format('DD/MM/YYYY')}</td>
                  <td className='justify-center flex'>
                    <button
                      className="text-gray-400 hover:text-gray-700"
                      onClick={(event) => handleOpenModal(event, ticket.id)}
                    >
                      <FaEllipsisH />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      {/* Modal */}
      {isModalOpen && (
        <div
          className="absolute bg-white rounded-lg shadow-lg w-40 border border-gray-200 bottom-30 "
          style={{
            top: `${modalPosition.y + window.innerHeight * 0.01}px`, // Add spacing below the button
            left: `${modalPosition.x - window.innerWidth * 0.07}px`, // Add spacing to the right of the button
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div ref={modalRef} className="flex flex-col items-start justify-center p-[7%] space-y-[6%]">
            <button className="text-black-500 flex items-center justify-start w-full hover:bg-gray-100" onClick={handleEditModal}>
              <FaEdit className="mr-2" />
              <span>Edit</span>
            </button>
            <button className="text-black-500 flex items-center justify-start w-full hover:bg-gray-100" onClick={toggleDeleteModal}>
              <FaTrash className="mr-2" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
      {deleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-[1%] w-[20%] h-[15%]">
            <h2 className="text-xl font-semibold text-gray-700 mb-[2%]">Are you sure you want to delete this ticket?</h2>
            <div className="flex justify-between">
              <button
                className={`px-[3%] py-[2%] ${loading ? 'bg-gray-100' : 'bg-gray-300'} text-gray-700 rounded-md hover:bg-gray-400`}
                onClick={toggleDeleteModal}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={`px-[3%] py-[2%] ${loading ? 'bg-white' : 'bg-green-500'} text-white rounded-md hover:bg-green-600`}
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? <LoadingComponent /> : "Ok"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <TicketTable
          visible={modalVisible}
          closeModal={toggleModal}
          fetchTicks={fetchTicketsData}
          fetchData={fetchData}
          selectedTicket={selectedTicketId} />
      </div>
      {/**pagination */}
      <div className=" flex justify-end mt-[-1.5%]">
        <PaginationNew
          canPreviousPage={canPreviousPage}
          canNextPage={canNextPage}
          gotoPage={gotoPage}
          previousPage={previousPage}
          nextPage={nextPage}
          pageIndex={pageIndex}
          pageOptions={pageOptions}
        />
      </div>
    </div>
  );
}
export function LoadingComponent() {
  return (
    <div className='flex justify-center items-center'>
      <div className="w-7 h-7 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
    </div>
  );
}