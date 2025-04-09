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
      setDescription(inputValue);
      setCharCount(inputLength);
    }
  };

  const handleHeadingChange = (e) => {};

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 1) {
      setMediaType("single");
      const fileUrl = URL.createObjectURL(files[0]);
      setPreview(fileUrl);
      setMediaFiles(files);
    } else if (files.length > 1 && files.length <= 5) {
      setMediaType("multiple");
      const fileUrls = files.map((file) => URL.createObjectURL(file));
      setPreview(fileUrls);
      setMediaFiles(files);
      setCurrentImageIndex(0); // Reset slideshow to first image
    }
  };

  const handleVideoUpload = (e) => {
    const videoFile = e.target.files[0];
    if (videoFile) {
      if (videoFile.size <= 15 * 1024 * 1024) {
        // 15MB limit
        const videoUrl = URL.createObjectURL(videoFile);
        setMediaType("video");
        setPreview(videoUrl);
        setMediaFiles([videoFile]);
        console.log("Video URL created:", videoUrl); // Log the video URL
      } else {
        toast.error("Video size exceeds 15MB limit.");
      }
    }
  };

  const handleAddHeadline = () => {
    if (headlines.length < 3) {
      setHeadlines([...headlines, ""]);
    }
  };

  const handleHeadlineChange = (e, index) => {
    const inputValue = e.target.value;
    const inputLength = inputValue.length;

    // Stop typing if input length exceeds 30 characters
    if (inputLength <= 30) {
      // Update only the headline at the specific index
      const updatedHeadlines = headlines.map((headline, i) =>
        i === index ? inputValue : headline
      );
      setHeadlines(updatedHeadlines);
      setCharCount(inputLength); // Update character count based on the current input
    }
  };
  // const uploadMediaFiles = async () => {
  //   const userId = localStorage.getItem("user_id");
  //   const mediaUrls = [];

  //   for (const file of mediaFiles) {
  //     // Check if the file already exists
  //     const { data: existingFiles, error: listError } = await supabase.storage.from("media").list('ads');

  //     if (listError) {
  //       console.error("Error listing files:", listError);
  //       return null;
  //     }

  //     // Check for duplicates
  //     const fileExists = existingFiles.some(existingFile => existingFile.name === file.name);

  //     let fileName = file.name;
  //     if (fileExists) {
  //       // If the file exists, append a timestamp or a counter to the filename
  //       const timestamp = new Date().getTime();
  //       fileName = `${timestamp}_${file.name}`;
  //       toast.warn("File with the same name exists. Renaming to: " + fileName);
  //     }

  //     // Step 1: Upload the file
  //     const { data, error: uploadError } = await supabase.storage.from("media").upload(`ads/${fileName}`, file);

  //     if (uploadError) {
  //       console.error("Error uploading file:", uploadError);
  //       return null;
  //     }

  //     console.log("Image uploaded successfully:", data);

  //     // Step 2: Get the public URL
  //     const { publicURL, error: urlError } = supabase.storage.from("media").getPublicUrl(`ads/${fileName}`);

  //     if (urlError || !publicURL) {
  //       const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/ads/`;
  //       const manualPublicURL = `${baseUrl}${fileName}`;
  //       console.log("Manual Public URL:", manualPublicURL);
  //       mediaUrls.push(manualPublicURL);
  //       continue;
  //     }

  //     mediaUrls.push(publicURL);
  //     console.log(`Uploaded: ${fileName}, Public URL: ${publicURL}`);
  //   }

  //   console.log("Media URLs:", mediaUrls);

  //   // Update the database with all media URLs at once
  //   const { error: updateError } = await supabase
  //     .from("banners_ads")
  //     .update({ mediaUrls })
  //     .eq("id", userId);

  //   if (updateError) {
  //     console.error("Error updating media URLs in database:", updateError);
  //     return null;
  //   }

  //   return mediaUrls;
  // };

  const onSubmit = async (data) => {
    setLoading(true); // Set loading to true at the start of the submission

    const mediaUrls = await uploadMediaFiles(
      "media",
      "ads",
      "banners_ads",
      mediaFiles
    );

    // Check for errors
    if (!mediaUrls || mediaUrls.length === 0) {
      toast.error("No media files uploaded.");
      setLoading(false); // Reset loading state in case of an error
      return;
    }

    // Prepare the ad data
    const adData = {
      bannerType: marketingType.toLowerCase(),
      created_at: moment(new Date()).valueOf(),
      updated_at: moment(new Date()).valueOf(),
      created_by: localStorage.getItem("user_id"),
      updated_by: localStorage.getItem("user_id"),
      is_created_by_admin_panel: true,
      headline: headlines,
      description: data.description,
      callToAction: selectedCTA,
      mediaType,
      videoUrls: mediaType === "video" ? mediaUrls : null,
      imageUrls:
        mediaType === "single" || mediaType === "multiple" ? mediaUrls : null,
      mediaUrls: [data?.primaryText.toLowerCase()],
      starting_date_and_time: data.starting_date_and_time,
      end_date_and_time: data.end_date_and_time,
      duration: 10000,
    };

    try {
      // Insert new ad
      const { error } = await supabase.from("banners_ads").insert([adData]);
      console.log("Ad Data to Insert:", adData);

      if (error) {
        toast.error("Error saving ad: " + error.message);
      } else {
        toast.success("Ad saved successfully!");
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="">
      <ToastContainer />
      <div className="mb-2 w-full">
        <SplitDropdown2
          label={"Marketing Type"}
          labelClass="font-normal"
          placeholder="Select marketing type"
          value={marketingType}
          onChange={(value) => {
            setMarketingType(value);
            console.log("Marketing Type:", marketingType);
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
                  mediaType === "multiple" || mediaType === "single"
                    ? mediaFiles
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
                selectedFile={mediaType === "video" ? mediaFiles[0] : null}
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
                    label={`Headline (Up to 30 characters)`}
                    placeholder="Write a short headline..."
                    value={headline}
                    onChange={(e) => handleHeadlineChange(e, index)}
                    maxLength={30}
                    className="capitalize w-full"
                    rows={1}
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
              placeholder="Include additional details..."
              register={register}
              name="description"
              // onChange={(e) => setDescription(e.target.value)}
              onChange={handleDescriptionChange}
              maxLength={90}
            />
            <p className="text-right text-gray-500 text-sm">{charCount}/90</p>
          </div>

          {/* Primary Text */}
          <Textarea
            className="mb-2 capitalize"
            label="Link"
            placeholder="Add hyperlinks if necessary..."
            register={register}
            onChange={(e) => setPrimaryText(e.target.value)}
            name="primaryText"
            rows={1}
          />

          {/* Call to Action */}
          <div className="mb-2">
            <p className="text-sm">Call To Action</p>
            <SplitDropdown2
              label={" "} // Display selected CTA or a placeholder
              labelClass="font-normal"
              value={selectedCTA} // This should reflect the selected CTA value
              placeholder="Select an option"
              onChange={(value) => {
                setValue("CTA", value);
              }}
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
                {description ||
                  "Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet assumendasz"}
              </p>
              <a
                href={primaryText || "#"}
                target="_blank"
                className="text-[#000] sm:text-sm text-xs px-2 py-1 bg-white rounded"
              >
                {selectedCTA || "Call to Action"}
              </a>
            </div>

            <div className="flex flex-col items-center justify-center">
              {/* Media Preview */}
              {mediaType === "" && !preview && (
                <div>
                  <img
                    src="/assets/images/all-img/pills.jpg"
                    alt="Dummy Preview"
                    width={300}
                    className="rounded"
                  />
                </div>
              )}
              {mediaType === "single" && preview && (
                <div className="w-full h-full overflow-hidden flex items-center">
                  <img
                    src={preview}
                    alt="Single Preview"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              )}
              {mediaType === "multiple" && preview && preview.length > 0 && (
                <div>
                  <img
                    src={preview[currentImageIndex]} // Show the current image
                    alt="Image Slideshow"
                    width={300}
                    className={`object-cover rounded shadow`}
                  />
                </div>
              )}
              {mediaType === "video" && preview && (
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
            />
            <Textinput
              name="end_date_and_time"
              label="End Date and Time"
              type="datetime-local" // Use 'datetime-local' to include both date and time
              placeholder=" "
              register={register}
              className="mb-2"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full mt-5"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
};

export default AdsForm;
