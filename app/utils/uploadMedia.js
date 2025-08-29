import { supabase } from "./supabaseClient";

export const uploadMediaFiles = async (
  bucketName,
  folderName,
  tableName,
  mediaFiles
) => {
  const userId = localStorage.getItem("user_id");
  const mediaUrls = [];

  for (const file of mediaFiles) {
    // Step 1: List existing files in the given bucket and folder
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(bucketName)
      .list(folderName);

    if (listError) {
      console.error("Error listing files:", listError);
      return null;
    }

    // Check for duplicates
    const fileExists = existingFiles?.some(
      (existingFile) => existingFile.name === file.name
    );

    let fileName = file.name;
    if (fileExists) {
      // If the file exists, append a timestamp to the filename
      const timestamp = new Date().getTime();
      fileName = `${timestamp}_${file.name}`;
      console.warn("File with the same name exists. Renaming to:", fileName);
    }

    // Step 2: Upload the file to the specified bucket and folder
    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(`${folderName}/${fileName}`, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return null;
    }

    console.log("File uploaded successfully:", data);

    // Step 3: Get the public URL of the uploaded file
    const { publicURL, error: urlError } = supabase.storage
      .from(bucketName)
      .getPublicUrl(`${folderName}/${fileName}`);

    if (urlError || !publicURL) {
      const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${folderName}/`;
      const manualPublicURL = `${baseUrl}${fileName}`;
      console.log("Manual Public URL:", manualPublicURL);
      mediaUrls.push(manualPublicURL);
      continue;
    }

    mediaUrls.push(publicURL);
    console.log(`Uploaded: ${fileName}, Public URL: ${publicURL}`);
  }

  console.log("Media URLs:", mediaUrls);

  // Note: Database update is handled by the calling function
  // This function only handles file uploads and returns URLs
  return mediaUrls;
};


/**
 * Uploads a file to Supabase Storage and returns the public URL.
 *
 * @param {File} file - The file to upload.
 * @param {string} bucket - Supabase storage bucket name.
 * @param {string} folder - Optional folder inside the bucket.
 * @returns {Promise<string>} - Public URL of uploaded file.
 */
export const uploadSingleFileToSupabase = async (file, bucket, folder = "") => {
  if (!file || !file.name) throw new Error("Invalid file provided");

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return data.publicUrl;
};

