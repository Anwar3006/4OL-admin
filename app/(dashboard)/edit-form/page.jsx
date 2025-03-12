"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabaseClient";
import { useForm } from "react-hook-form";
import Fileinput from "@/components/ui/Fileinput";
import Textarea from "@/components/ui/Textarea";
import SplitDropdown2 from "@/components/ui/Split-Dropdown2";
import { toast, ToastContainer } from "react-toastify";
import Textinput from "@/components/ui/Textinput";
import moment from "moment";
import { uploadMediaFiles } from "@/app/utils/uploadMedia";
import { useSearchParams } from "next/navigation";

const marketingTypes = ["ads", "events", "news", "health"];

const AdsForm = () => {
  const [mediaType, setMediaType] = useState(""); // 'single', 'multiple', 'video'
  const [mediaFiles, setMediaFiles] = useState([]); // Holds uploaded files
  const [preview, setPreview] = useState(null); // For single image preview
  const [headlines, setHeadlines] = useState([""]); // Start with one headline
  const [description, setDescription] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // For slideshow
  const [charCount, setCharCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marketingType, setMarketingType] = useState("Ads");
  const [minDateTime, setMinDateTime] = useState("");

  const { register, handleSubmit, watch, setValue, reset } = useForm();
  const selectedCTA = watch("CTA") || ""; // Watch the CTA field

  const searchParams = useSearchParams();
  const itemData = searchParams.get("item");
  const item = itemData ? JSON.parse(decodeURIComponent(itemData)) : null;

  const [formData, setFormData] = useState({
    bannerType: item?.bannerType || "",
    callToAction: item?.callToAction || "",
    headline: item?.headline || "",
    isPublished: item?.isPublished ?? null,
    mediaType: item?.mediaType || "",
    description: item?.description || "",
    imageUrls: Array.isArray(item?.imageUrls) ? item.imageUrls : [], // Ensure it's an array
    videoUrls: Array.isArray(item?.videoUrls) ? item.videoUrls : [],
    starting_date_and_time: item?.starting_date_and_time || "",
    end_date_and_time: item?.end_date_and_time || "",
    mediaUrls: Array.isArray(item?.mediaUrls) ? item.mediaUrls : [],
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const ctaLabels = [
    "Apply now",
    "Book now",
    "Call now",
    "Contact us",
    "Donate now",
    "Get Directions",
    "Get Offer",
    "Get Quote",
    "Install now",
    "Learn more",
    "Like Page",
    "Listen Now",
    "Open Link",
    "Order Now",
    "Play Game",
    "Request Time",
    "Save",
    "See Menu",
    "Send Message",
    "Send Whatsapp Message",
    "Shop Now",
    "Signup",
    "Subscribe",
    "Use app",
    "View Event",
    "Watch More",
  ];

  useEffect(() => {
    const now = new Date();
    const formattedDateTime = now.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
    setMinDateTime(formattedDateTime);

    // Restrict the minimum date and time selection
    document
      .getElementsByName("starting_date_and_time")[0]
      ?.setAttribute("min", formattedDateTime);
    document
      .getElementsByName("end_date_and_time")[0]
      ?.setAttribute("min", formattedDateTime);
  }, []);

  const handleDescriptionChange = (e) => {
    const inputValue = e.target.value;
    const inputLength = inputValue.length;

    // Stop typing if input length exceeds 90 characters
    if (inputLength <= 90) {
      setFormData((prevState) => ({ ...prevState, description: inputValue }));
      setCharCount(inputLength);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 1) {
      setFormData((prev) => ({
        ...prev,
        mediaType: "single",
        imageUrls: [URL.createObjectURL(files[0])], // Store image URL
      }));
    } else if (files.length > 1 && files.length <= 5) {
      setFormData((prev) => ({
        ...prev,
        mediaType: "multiple",
        imageUrls: files.map((file) => URL.createObjectURL(file)), // Store multiple image URLs
      }));
      setCurrentImageIndex(0); // Reset slideshow to first image
    }
  };

  const handleVideoUpload = (e) => {
    const videoFile = e.target.files[0];
    if (videoFile) {
      if (videoFile.size <= 15 * 1024 * 1024) {
        // 15MB limit
        setFormData((prev) => ({
          ...prev,
          mediaType: "video",
          videoUrls: [URL.createObjectURL(videoFile)], // Store video URL
        }));
        console.log("Video URL created:", URL.createObjectURL(videoFile));
      } else {
        toast.error("Video size exceeds 15MB limit.");
      }
    }
  };

  const handleAddHeadline = () => {
    if (headlines.length < 3) {
      setHeadlines([...headlines, ""]);
      setFormData((prev) => ({
        ...prev,
        headline: [...prev.headline, ""], // Ensure formData updates correctly
      }));
    }
  };

  const handleHeadlineChange = (e, index) => {
    const inputValue = e.target.value;
    const inputLength = inputValue.length;

    // Stop typing if input length exceeds 30 characters
    if (inputLength <= 30) {
      // Update only the headline at the specific index
      const updatedHeadlines = [...formData.headline];
      updatedHeadlines[index] = inputValue;

      // Remove empty headlines while updating
      const filteredHeadlines = updatedHeadlines.filter(
        (headline) => headline.trim() !== ""
      );

      setFormData((prev) => ({
        ...prev,
        headline: filteredHeadlines,
      }));

      setHeadlines(filteredHeadlines); // Keep headlines array in sync
      setCharCount(inputLength); // Update character count
    }
  };

  const onSubmit = async (data) => {
    setLoading(true); // Set loading to true at the start of the submission

    const mediaUrls = await uploadMediaFiles(
      "media",
      "ads",
      "banners_ads",
      mediaFiles
    );

    // Check for errors
    // if (!mediaUrls || mediaUrls.length === 0) {
    //   toast.error("No media files uploaded.");
    //   setLoading(false); // Reset loading state in case of an error
    //   return;
    // }

    // Prepare the ad data
    const adData = {
      bannerType: formData?.bannerType,
      created_at: moment(new Date()).valueOf(),
      updated_at: moment(new Date()).valueOf(),
      created_by: localStorage.getItem("user_id"),
      updated_by: localStorage.getItem("user_id"),
      is_created_by_admin_panel: true,
      headline: formData?.headline,
      description: formData?.description,
      callToAction: formData?.callToAction,
      mediaType: formData?.mediaType,
      videoUrls: formData?.mediaType === "video" ? formData?.videoUrls : null,
      imageUrls:
        formData?.mediaType === "single" || formData?.mediaType === "multiple"
          ? formData?.imageUrls
          : null,
      mediaUrls: formData?.mediaUrls, // Store the array of URLs
      starting_date_and_time: formData?.starting_date_and_time,
      end_date_and_time: formData?.end_date_and_time,
    };

    try {
      // Insert new ad
      const { error } = await supabase
        .from("banners_ads")
        .update([adData])
        .eq("id", item?.id);
      console.log("Ad Data to Insert:", adData);

      if (error) {
        toast.error("Error updating ad: " + error.message);
      } else {
        toast.success("Ad updated successfully!");
        reset(); // Reset the form after successful submission
      }
    } catch (error) {
      console.error("Error during submission:", error);
      toast.error("An error occurred during submission.");
    } finally {
      setLoading(false); // Reset loading state after submission (success or failure)
    }
  };

  // Slideshow logic for multiple images
  useEffect(() => {
    if (mediaType === "multiple" && preview?.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % preview.length);
      }, 3000); // Change image every 3 seconds

      return () => clearInterval(interval); // Cleanup on component unmount
    }
  }, [mediaType, preview]);

  console.log("Here is =>", item);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4">
      <ToastContainer />
      <div className="mb-2 w-full">
        <SplitDropdown2
          label={"Marketing Type"}
          labelClass="font-normal"
          placeholder="Select marketing type"
          value={formData?.bannerType || null}
          onChange={(selectedValue) => {
            console.log("selected banner:", selectedValue);
            setFormData((prev) => ({
              ...prev,
              bannerType: selectedValue.toLowerCase(),
            }));
          }}
          items={
            marketingTypes.map((type) => ({
              label: type.charAt(0).toUpperCase() + type.slice(1),
              value: type,
            })) || []
          }
          classMenuItems="ltr:left-0 max-h-40 overflow-y-auto w-[300px]  shadow-md  rounded-lg"
          inputClass="hidden"
          required={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {/* Media Type Inputs */}
          <div className="mb-2">
            <label className="mb-5 text-sm">
              Media Type{" "}
              <span className="text-red-600 text-xs">
                (Upload Images or a Video)
              </span>
            </label>
            <div className="">
              <Fileinput
                name="imageUpload"
                onChange={handleImageUpload}
                multiple={true}
                placeholder="Upload Images"
                selectedFiles={
                  formData?.mediaType === "multiple" ||
                  formData?.mediaType === "single"
                    ? formData?.imageUrls
                    : []
                }
                //   preview={mediaType === 'multiple' || mediaType === 'single' ? preview : ''}
                mediaType="image"
                className="mb-2"
              />
              <Fileinput
                name="videoUpload"
                onChange={handleVideoUpload}
                placeholder="Upload Video"
                multiple={false}
                selectedFile={mediaType === "video" ? formData?.videoUrls : []}
                //   preview={mediaType === 'video' ? preview : ''}
                mediaType="video"
              />
            </div>
          </div>

          {/* Headlines */}
          <div className="mb-2 w-full">
            {headlines.map((headline, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <div className="w-full">
                  <Textarea
                    name={`headline_${index}`} // Unique name for each field
                    label={`Headline (Up to 30 characters)`}
                    placeholder={formData?.headline[0] || ""}
                    value={
                      formData?.headline?.find((_, i) => i === index) || ""
                    }
                    onChange={(e) => handleHeadlineChange(e, index)}
                    maxLength={30}
                    className="capitalize w-full"
                    rows={1}
                    register={register}
                  />
                </div>
                {headlines.length > 1 && (
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => {
                      const newHeadlines = headlines.filter(
                        (_, i) => i !== index
                      );
                      setHeadlines(newHeadlines);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <p className="text-right text-gray-500 text-sm">{charCount}/30</p>
            {headlines.length < 3 && (
              <button
                type="button"
                className="text-xs mt-2 text-[#56ce84] font-semibold"
                onClick={handleAddHeadline}
              >
                + Headline
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <Textarea
              className="mb-2 capitalize"
              label="Description (Optional)"
              placeholder={formData?.description || ""}
              register={register}
              name="description"
              value={formData?.description || ""}
              // onChange={(e) => setDescription(e.target.value)}
              onChange={handleDescriptionChange}
              maxLength={90}
            />
            <p className="text-right text-gray-500 text-sm">{charCount}/90</p>
          </div>

          {/*Link */}
          <Textarea
            className="mb-2 capitalize"
            label="Link"
            placeholder="Add hyperlinks if necessary..."
            value={formData?.mediaUrls[0] || ""}
            register={register}
            onChange={(e) => {
              console.log("mediaUrl:", e.target.value);
              setFormData((prev) => {
                const updatedForm = {
                  ...prev,
                  mediaUrls: [e.target.value], // Ensure it's stored as an array
                };
                console.log("Updated formData:", updatedForm);
                return updatedForm;
              });
            }}
            name="primaryText"
            rows={1}
          />

          {/* Call to Action */}
          <div className="mb-2">
            <p className="text-sm">Call To Action</p>
            <SplitDropdown2
              label={" "} // Display selected CTA or a placeholder
              labelClass="font-normal"
              value={formData?.callToAction || null} // This should reflect the selected CTA value
              placeholder="Select an option"
              onChange={(selectedValue) =>
                setFormData((prev) => ({
                  ...prev,
                  callToAction: selectedValue,
                }))
              }
              items={ctaLabels.map((label) => ({ label }))} // Pass the CTA labels as options
              classMenuItems="ltr:left-0 max-h-40 overflow-y-auto w-[200px]"
              required={false}
              inputClass="hidden"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="w-full flex flex-col max-lg:flex-col-reverse gap-y-3">
          <div>Preview</div>
          <div className="lg:w-[100%] text-white mx-auto bg-[#56ce84] rounded grid grid-cols-2 lg:p-5 p-2 shadow-md">
            <div className="flex flex-col text-left items-start">
              <h2 className="md:text-2xl text-base font-serif font-medium text-white">
                {headlines.filter(Boolean).length > 0
                  ? headlines[0]
                  : "Medicine"}
              </h2>
              <p className="sm:tracking-wider tracking-wide my-2 max-sm:text-xs">
                {formData?.description ||
                  "Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet assumendasz"}
              </p>
              <a
                href={formData?.mediaUrls || "#"}
                target="_blank"
                className="text-[#000] sm:text-sm text-xs px-2 py-1 bg-white rounded"
              >
                {formData?.callToAction || "Call to Action"}
              </a>
            </div>

            <div className="flex flex-col items-center justify-center">
              {/* Media Preview */}
              {formData?.mediaType === "" && (
                <div>
                  <img
                    src="/assets/images/all-img/pills.jpg"
                    alt="Dummy Preview"
                    width={300}
                    className="rounded"
                  />
                </div>
              )}
              {formData?.mediaType === "single" && (
                <div className="w-full h-full overflow-hidden flex items-center">
                  <img
                    src={formData?.imageUrls}
                    alt="Single Preview"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              )}
              {formData?.mediaType === "multiple" && (
                <div>
                  <img
                    src={preview[currentImageIndex]} // Show the current image
                    alt="Image Slideshow"
                    width={300}
                    className={`object-cover rounded shadow`}
                  />
                </div>
              )}
              {formData?.mediaType === "video" && preview && (
                <div>
                  <video
                    src={preview}
                    controls
                    width={300}
                    className="rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* starting and ending date and time */}
          <div className="lg:mt-5 -mt-5 lg:w-[90%] w-full mx-auto">
            <Textinput
              name="starting_date_and_time"
              label="Starting Date and Time"
              type="datetime-local" // Use 'datetime-local' to include both date and time
              placeholder=" "
              register={register}
              className="mb-2"
              value={
                formData?.starting_date_and_time
                  ? new Date(formData.starting_date_and_time)
                      .toISOString()
                      .slice(0, 16) // Format correctly
                  : ""
              }
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  starting_date_and_time: e.target.value, // Store as string to prevent conversion issues
                }))
              }
            />
            <Textinput
              name="end_date_and_time"
              label="End Date and Time"
              type="datetime-local" // Use 'datetime-local' to include both date and time
              placeholder=" "
              register={register}
              className="mb-2"
              value={
                formData?.end_date_and_time
                  ? new Date(formData.end_date_and_time)
                      .toISOString()
                      .slice(0, 16) // Format correctly
                  : ""
              }
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  end_date_and_time: e.target.value, // Store as string to prevent conversion issues
                }))
              }
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full mt-5"
        >
          {loading ? "Updating..." : "Update"}
        </button>
      </div>
    </form>
  );
};

export default AdsForm;
