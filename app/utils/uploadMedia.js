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

  // Step 4: Update the database with all media URLs at once in the specified table
  const { error: updateError } = await supabase
    .from(tableName)
    .update({ mediaUrls })
    .eq("id", userId);

  if (updateError) {
    console.error("Error updating media URLs in the database:", updateError);
    return null;
  }

  return mediaUrls;
};
