import { useEffect, useState } from 'react';
import { supabase } from '@/app/utils/supabaseClient';
import { useForm } from 'react-hook-form';
import Fileinput from '@/components/ui/Fileinput';
import Textarea from '@/components/ui/Textarea';
import SplitDropdown2 from '@/components/ui/Split-Dropdown2';
import { toast, ToastContainer } from 'react-toastify';
import Link from 'next/link';

const AdsForm = () => {
  const [mediaType, setMediaType] = useState(''); // 'single', 'multiple', 'video'
  const [mediaFiles, setMediaFiles] = useState([]); // Holds uploaded files
  const [preview, setPreview] = useState(null); // For single image preview
  const [headlines, setHeadlines] = useState(['']); // Start with one headline
  const [description, setDescription] = useState('');
  const [primaryText, setPrimaryText] = useState('');

  const { register, handleSubmit, watch, setValue } = useForm();
  const selectedCTA = watch("CTA") || ""; // Watch the CTA field

  const ctaLabels = [
    "Apply now", "Book now", "Call now", "Contact us", "Donate now",
    "Get Directions", "Get Offer", "Get Quote", "Install now", "Learn more",
    "Like Page", "Listen Now", "Open Link", "Order Now", "Play Game",
    "Request Time", "Save", "See Menu", "Send Message", "Send Whatsapp Message",
    "Shop Now", "Signup", "Subscribe", "Use app", "View Event", "Watch More"
  ];

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 1) {
      setMediaType('single');
      const fileUrl = URL.createObjectURL(files[0]);
      setPreview(fileUrl);
      setMediaFiles(files);
    } else if (files.length > 1 && files.length <= 5) {
      setMediaType('multiple');
      const fileUrls = files.map((file) => URL.createObjectURL(file));
      setPreview(fileUrls);
      setMediaFiles(files);
    }
  };

  const handleVideoUpload = (e) => {
    const videoFile = e.target.files[0];
    if (videoFile) {
      if (videoFile.size <= 15 * 1024 * 1024) { // 15MB limit
        const videoUrl = URL.createObjectURL(videoFile);
        setMediaType('video');
        setPreview(videoUrl);
        setMediaFiles([videoFile]);
        console.log('Video URL created:', videoUrl); // Log the video URL
      } else {
        toast.error('Video size exceeds 15MB limit.');
      }
    }
  };

  const handleAddHeadline = () => {
    if (headlines.length < 3) {
      setHeadlines([...headlines, '']);
    }
  };

  const handleHeadlineChange = (index, value) => {
    const updatedHeadlines = headlines.map((headline, i) => (i === index ? value : headline));
    setHeadlines(updatedHeadlines);
  };

  const onSubmit = async (data) => {
    const promises = mediaFiles.map(async (file) => {
      const { data: fileData, error } = await supabase.storage
        .from('media')
        .upload(`ads/${file.name}`, file);
      if (error) {
        console.log('Error uploading file:', error);
        return null;
      }
      return supabase.storage.from('media').getPublicUrl(`ads/${file.name}`).data.publicUrl;
    });

    const mediaUrls = await Promise.all(promises);

    const { data: adData, error } = await supabase.from('ads').insert([{
      headlines,
      description: data.description,
      primaryText: data.primaryText,
      callToAction: selectedCTA,
      mediaType,
      mediaUrls,
    }]);

    if (error) {
        toast.error(error.message); 
        console.error('Error saving ad:', error);
    } else {
        toast.success('Ad saved successfully!');
        console.log('Ad saved successfully:', adData);
    }
  };
  

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full">
        <ToastContainer />
        {/* Media Type Inputs */}
        <div className='mb-2'>
          <label className="mb-5 text-sm">Media Type <span className='text-red-600 text-xs'>(Upload Images or a Video)</span></label>
          <div className=''>
            <Fileinput
              name="imageUpload"
              onChange={handleImageUpload}
              multiple={true}
              placeholder="Upload images"
              selectedFiles={mediaType === 'multiple' || mediaType === 'single' ? mediaFiles: []}
            //   preview={mediaType === 'multiple' || mediaType === 'single' ? preview : ''}
              mediaType="image"
              className='mb-2'
            />
            <Fileinput
              name="videoUpload"
              onChange={handleVideoUpload}
              placeholder="Upload video"
              multiple={false}
              selectedFile={mediaType === 'video' ? mediaFiles[0] : null}
            //   preview={mediaType === 'video' ? preview : ''}
              mediaType="video"
            />
          </div>
        </div>

        {/* Headlines */}
        <div className='mb-2'>
          {headlines.map((headline, index) => (
            <Textarea
              key={index}
              label={`Headline (Up to 30 characters)`}
              placeholder='Write a short headline...'
              value={headline}
              onChange={(e) => handleHeadlineChange(index, e.target.value)}
              maxLength={30}
              rows={1}
            />
          ))}
          {/* {headlines.length < 3 && (
            <button
              type="button"
              className="text-xs mt-2 text-[#56ce84] font-semibold"
              onClick={handleAddHeadline}
            >
              + Headline
            </button>
          )} */}
        </div>

        {/* Description */}
        <Textarea
          className='mb-2'
          label="Description (Optional)"
          placeholder="Include additional details..."
          register={register}
          name="description"
          onChange={(e) => setDescription(e.target.value)}
          maxLength={90}
        />

        {/* Primary Text */}
        <Textarea
          className='mb-2'
          label="Primary Text"
          placeholder="Add primary text with hyperlinks if necessary..."
          register={register}
          onChange={(e) => setPrimaryText(e.target.value)}
          name="primaryText"
        />

        {/* Call to Action */}
        <div className="mb-2">
          <p className="text-sm">Call To Action</p>
          <SplitDropdown2
            label={" "} // Display selected CTA or a placeholder
            labelClass="font-normal"
            value={selectedCTA} // This should reflect the selected CTA value
            placeholder="Select an option"
            onChange={(value) => { setValue("CTA", value); }}
            items={ctaLabels.map((label) => ({ label }))} // Pass the CTA labels as options
            classMenuItems="ltr:left-0 max-h-40 overflow-y-auto w-[200px]" 
            required={false}
            inputClass='hidden'
          />
        </div>

        <button type="submit" className="btn bg-[#56ce84] text-white block lg:w-[50%] w-full text-center col-span-full">
          {'Submit'}
        </button>
      </form>

      {/* Preview */}
      <div className='w-full'>
        <div className='md:w-[90%] text-white mx-auto bg-[#56ce84] rounded grid grid-cols-2 lg:p-5 p-2'>
          <div className='flex flex-col text-left items-start'>
            <h2 className='md:text-2xl text-base font-serif font-medium text-white'>{headlines.filter(Boolean).length > 0 ? headlines[0] : 'Medicine'}</h2>
            <p className='sm:tracking-wider tracking-wide my-2 max-sm:text-xs'>{description || 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet assumendasz'}</p>
            <a href={primaryText || '#'} target='_blank' className='text-[#000] sm:text-sm text-xs px-2 py-1 bg-white rounded'>
              {selectedCTA || 'Call to Action'}
            </a>
          </div>

          <div>
            {/* Media Preview */}
            {mediaType === '' && !preview && (
              <div>
                <img src='/assets/images/all-img/pills.jpg' alt="Dummy Preview" width={300} className='rounded' />
              </div>
            )}
            {mediaType === 'single' && preview && (
       <div className='w-full h-full overflow-hidden'>
       <img src={preview} alt="Single Preview" className='w-full h-full object-cover rounded' />
     </div>
            )}
            {mediaType === 'multiple' && preview?.length && (
              <div>
                {preview.map((url, index) => (
                  <img key={index} src={url} alt={`Preview ${index + 1}`} width={300} className='rounded'/>
                ))}
              </div>
            )}
            {mediaType === 'video' && preview && (
              <div>
                <video src={preview} controls width={300} className='rounded' />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdsForm;
