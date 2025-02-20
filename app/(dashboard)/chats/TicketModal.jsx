import { useEffect, useState } from 'react';
import { supabase } from '@/app/utils/supabaseClient';
import { toast } from 'react-toastify';
import { LoadingComponent } from './page';

export default function TicketTable({ visible, closeModal, fetchTicks, fetchData, selectedTicket }) {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedTicket) {
      setPriority(selectedTicket.priority);
      setStatus(selectedTicket.status);
    }
  }, [selectedTicket]);

  const handleUpdate = async () => {
    if (priority === selectedTicket.priority && status === selectedTicket.status) {
      console.log('No changes detected, update canceled');
      toast.warn("Please update status and priority", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('chat_support')
      .update({ priority: priority, status: status })
      .eq('id', selectedTicket.id);
    if (error) {
      console.log('Error updating entries', error);
    } else {
      console.log('Ticket updated successfully');
      closeModal();
      fetchTicks();
      fetchData();
      setLoading(false);
      toast.success("Updated successfully", {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
    }
  };

  return (
    <>
      {visible && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-[2%] rounded-lg w-[25%] flex flex-col items-start shadow-lg">
            {/* Header */}
            <div className="w-full flex justify-between items-center mb-[3%]">
              <h2 className="text-xl font-semibold">Edit Ticket</h2>
              {/* <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✖</button> */}
            </div>

            {/* Request By */}
            <div className="mb-[3%] w-full">
              <p className="text-gray-500 text-sm">Request By</p>
              <div className="flex items-center mt-[1%]">
                <img src={selectedTicket?.users?.avatar_url || '/assets/images/chat/chat-4.png'} alt="Avatar" className="w-8 h-8 rounded-full mr-[2%]" />
                <span className="text-black font-bold ml-[2%]">{selectedTicket.user_name}</span>
              </div>
            </div>

            {/* Subject */}
            <div className="mb-[3%] w-full">
              <p className="text-gray-500 text-sm">Subject</p>
              <p className="text-black font-bold ml-[2%]">{selectedTicket.subject}</p>
            </div>

            {/* Message */}
            <div className="mb-[3%] w-full">
              <p className="text-gray-500 text-sm">Message</p>
              <p className="text-black font-bold ml-[2%] break-words whitespace-pre-line">{selectedTicket.message}</p>
            </div>

            {/* Dropdowns */}
            <div className="mb-[3%] w-full flex justify-between">
              {/* Priority */}
              <div className="w-1/2">
                <p className="text-gray-500 text-sm">Priority</p>
                <select
                  className={`w-full p-[4%] border rounded-md mt-[2%] ${loading ? 'text-gray' : 'text-black font-bold'}`}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={loading}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Status */}
              <div className="w-1/2 pl-[2%]">
                <p className="text-gray-500 text-sm">Status</p>
                <select
                  className={`w-full p-[4%] border rounded-md mt-[2%] ${loading ? 'text-gray' : 'text-black font-bold'}`}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="w-full flex justify-between mt-[4%]">
              <button
                onClick={closeModal}
                className={`px-[4%] py-[2%] ${loading ? 'bg-gray-100' : 'bg-gray-300'} text-black rounded-md hover:bg-gray-400`}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className={`px-[3%] py-[2%] ${loading ? 'bg-white' : 'bg-green-500'} text-white rounded-md hover:bg-green-600`}
                disabled={loading}
              >
                {loading ? <LoadingComponent/> : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
