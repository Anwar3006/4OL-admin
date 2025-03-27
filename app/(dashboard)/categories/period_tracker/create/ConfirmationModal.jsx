import React from "react";
import Modal from "@/components/period_tracker/Modal";
import CalendarComponent from "@/components/period_tracker/Calendar";

const ConfirmationModal = ({
  confirmModal,
  setConfirmModal,
  confirmData,
  itemData,
  handleConfirmAddition,
  handleConfirmUpdate,
}) => (
  <Modal
    title="Confirm Cycle Details"
    activeModal={confirmModal}
    onClose={() => setConfirmModal(false)}
    centered
    themeClass="bg-[#4ab573]"
  >
    {confirmData && (
      <div className="p-4">
        <CalendarComponent confirmData={confirmData} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <button
            onClick={() => setConfirmModal(false)}
            className="md:col-span-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={itemData ? handleConfirmUpdate : handleConfirmAddition}
            className="md:col-span-1 px-4 py-2 bg-[#56ce84] hover:bg-[#46b276] text-white rounded"
          >
            {itemData ? "Confirm & Update" : "Confirm & Add"}
          </button>
        </div>
      </div>
    )}
  </Modal>
);

export default ConfirmationModal;
