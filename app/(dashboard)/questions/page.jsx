"use client";
import Card from "@/components/period_tracker/Card";
import Button from "@/components/ui/Button";
import Accordion from "@/components/ui/Accordion";
import getFaqs from "@/services/getFaqs";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import { supabase } from "@/app/utils/supabaseClient";
import Modal from "@/components/ui/Modal";

export default function FaqPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [currentFaqId, setCurrentFaqId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    setLoading(true);
    const data = await getFaqs();
    if (data) {
      setFaqs(data);
    }
    setLoading(false);
  };

  const handleEdit = (faq) => {
    setIsEditing(true);
    setCurrentFaqId(faq.id);
    setNewFaq({ question: faq.question, answer: faq.answer });
    setShowModal(true);
  };

  const handleDelete = async (faq) => {
    if (
      window.confirm(
        `Are you sure you want to delete the FAQ: "${faq.question}"?`
      )
    ) {
      try {
        const { error } = await supabase.from("FAQs").delete().eq("id", faq.id);

        if (error) {
          throw error;
        }

        toast.success("FAQ deleted successfully");
        loadFaqs(); // Reload FAQs after deletion
      } catch (error) {
        console.error("Error deleting FAQ:", error);
        toast.error("Failed to delete FAQ");
      }
    }
  };

  const handleAddFaq = async () => {
    // Validate inputs
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      if (isEditing) {
        // Update existing FAQ
        const { error } = await supabase
          .from("FAQs")
          .update({
            question: newFaq.question,
            answer: newFaq.answer,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentFaqId);

        if (error) {
          throw error;
        }

        toast.success("FAQ updated successfully");
      } else {
        // Add new FAQ
        const userId = localStorage.getItem("user_id");
        const { error } = await supabase
          .from("FAQs")
          .insert([
            {
              question: newFaq.question,
              answer: newFaq.answer,
              created_by: userId,
            },
          ])
          .select();

        if (error) {
          throw error;
        }

        toast.success("FAQ added successfully");
      }

      // Reset form and close modal
      setShowModal(false);
      setNewFaq({ question: "", answer: "" });
      setIsEditing(false);
      setCurrentFaqId(null);
      loadFaqs(); // Reload FAQs after adding new one
    } catch (error) {
      console.error("Error managing FAQ:", error);
      toast.error(`Failed to ${isEditing ? "update" : "add"} FAQ`);
    }
  };

  const handleClearForm = () => {
    setNewFaq({ question: "", answer: "" });
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentFaqId(null);
    setNewFaq({ question: "", answer: "" });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setCurrentFaqId(null);
    setNewFaq({ question: "", answer: "" });
  };

  return (
    <div className="">
      <ToastContainer />
      <div className="mt-8 relative">
        <Card
          title="FAQs"
          className="bg-white dark:bg-slate-800 overflow-hidden min-h-[80vh]"
          bodyClass=""
        >
          <div className="absolute top-2 right-2 justify-end p-4">
            <Button
              text="Add new FAQ"
              icon="heroicons-outline:plus"
              className="bg-[#56ce84] text-white rounded-md p-2 text-sm hover:bg-[#46b276] transition-colors"
              onClick={openAddModal}
            />
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#56ce84]"></div>
              </div>
            ) : faqs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">
                  No FAQs found. Create your first one!
                </p>
              </div>
            ) : (
              faqs.map((faq) => (
                <Accordion
                  key={faq.id}
                  question={faq.question}
                  answer={faq.answer}
                  onEdit={() => handleEdit(faq)}
                  onDelete={() => handleDelete(faq)}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Add/Edit FAQ Modal */}
      <Modal
        activeModal={showModal}
        onClose={closeModal}
        title={isEditing ? "Edit FAQ" : "Add New FAQ"}
        centered
        className="max-w-lg"
        themeClass="bg-[#56ce84] dark:bg-[#56ce84]"
        footerContent={
          <>
            <Button
              text="Clear"
              className="bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200"
              onClick={handleClearForm}
            />
            <Button
              text={isEditing ? "Update FAQ" : "Add FAQ"}
              className="bg-[#56ce84] text-white hover:bg-[#46b276]"
              onClick={handleAddFaq}
            />
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Question
            </label>
            <textarea
              rows="3"
              className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#56ce84] dark:bg-slate-700 dark:text-slate-200"
              placeholder="Enter question here..."
              value={newFaq.question}
              onChange={(e) =>
                setNewFaq({ ...newFaq, question: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Answer
            </label>
            <textarea
              rows="5"
              className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#56ce84] dark:bg-slate-700 dark:text-slate-200"
              placeholder="Enter answer here..."
              value={newFaq.answer}
              onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
