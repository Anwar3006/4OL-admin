import { addFacility } from "@/actions/facility.actions";

export const healthcareProfile = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { error } = await addFacility({
      facility_type: user.facility_type,
      facility_name: user.facility_name,
      contact_num: user.contact_num,
      whatsapp: user.whatsapp,
      email: user.email,
      gps_address: user.gps_address,
      street: user.street,
      post_code: user.post_code,
      area: user.area,
      district: user.district,
      region: user.region,
      country: user.country,
      hospital_services: user.hospital_services,
      hospital_amenities: user.hospital_amenities,
      pharmacy_services: user.pharmacy_services,
      first_name: user.first_name,
      last_name: user.last_name,
      person_contact_number: user.person_contact_number,
      position: user.position,
      business_hours: user.business_hours,
      mediaUrls: user.mediaUrls,
      keywords: user.keywords,
      device_name: user.device_name,
      device_model: user.device_model,
      device_vendor: user.device_vendor,
      operating_system: user.os,
      operating_system_version: user.os_version,
      device_type: user.device_type,
      browser: user.browser,
      latitude: user.latitude,
      longitude: user.longitude,
    });

    if (error) {
      errorCallback(new Error(error));
      return;
    }

    successCallback();
  } catch (err) {
    errorCallback(err);
  }
};
