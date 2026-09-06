import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAddFAQDialog } from "@/stores/dialog-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@radix-ui/react-dialog";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TFAQInput, faqInputSchema } from "@/features/faq/schema/types";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomInput from "@/components/CustomInput";
import {
  useCreateFAQ,
  useFAQCategories,
  useUpdateFAQ,
} from "@/features/faq/data/useFAQ";
import { ManageCategoryDialog } from "./add-faq-category-dialog";

const AddFAQDialog = () => {
  const addFAQ = useAddFAQDialog();
  const createFAQ = useCreateFAQ();
  const updateFAQ = useUpdateFAQ();

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);

  const { data: faqCategories, isLoading: isLoadingCategories } =
    useFAQCategories();

  const form = useForm<TFAQInput>({
    resolver: zodResolver(faqInputSchema),
    defaultValues: {
      question: "",
      answer: "",
      category_id: "",
    },
  });

  // Reset form when opening dialog or when data changes
  useEffect(() => {
    if (addFAQ.isOpen && addFAQ.data) {
      form.reset({
        question: addFAQ.data.question,
        answer: addFAQ.data.answer,
        category_id: addFAQ.data.category_id, // Ensure this is mapped in your store
      });
    } else if (addFAQ.isOpen) {
      form.reset({
        question: "",
        answer: "",
        category_id: "",
      });
    }
  }, [addFAQ.isOpen, addFAQ.data, form]);

  const handleClose = () => {
    form.reset();
    addFAQ.close();
  };

  const handleSubmit = async (data: TFAQInput) => {
    try {
      if (addFAQ.isEditMode && addFAQ.data?.id) {
        await updateFAQ.mutateAsync({
          id: addFAQ.data.id,
          data,
        });
      } else {
        await createFAQ.mutateAsync(data);
      }
      handleClose();
    } catch (error) {
      console.error("FAQ operation error:", error);
    }
  };

  const isSubmitting = createFAQ.isPending || updateFAQ.isPending;

  return (
    <>
      <Dialog open={addFAQ.isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5 px-2 md:px-6">
          <DialogHeader>
            <DialogTitle>
              {addFAQ.isEditMode ? `Edit FAQ` : `Create New FAQ`}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4">
                {/* Category Dropdown */}
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Category</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto p-0 text-emerald-600 hover:text-emerald-700 text-xs gap-1"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation(); // Stops event from bubbling to FormItem
                            setIsCategoryDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3" /> New Category
                        </Button>
                      </div>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                            <SelectValue
                              placeholder={
                                isLoadingCategories
                                  ? "Loading categories..."
                                  : "Select a category"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {faqCategories?.map((category: any) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <CustomInput
                  type="text"
                  name="question"
                  control={form.control}
                  label="Question"
                  placeholder="Enter the frequently asked question"
                  readOnly={false}
                />

                <CustomInput
                  type="textarea"
                  name="answer"
                  control={form.control}
                  label="Answer"
                  placeholder="Enter the answer"
                  readOnly={false}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isSubmitting || isLoadingCategories}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      {addFAQ.isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : addFAQ.isEditMode ? (
                    "Update FAQ"
                  ) : (
                    "Create FAQ"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ManageCategoryDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
      />
    </>
  );
};

export default AddFAQDialog;
