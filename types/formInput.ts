import { BusinessDay } from "../schemas/facility-profile.schema";
import { ADMIN_ROLES, ADMIN_ROLE_OPTIONS } from "../lib/admin-roles";

// Define the sex options
export const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];
// For database enum
export const SEX_ENUM = ["male", "female", "other"] as const;

// Full platform role vocabulary ("user" plus every admin role) — needed so
// the registration form's schema can accept an invited admin role. This is
// NOT the list to render as public, user-selectable options; see
// PUBLIC_ROLE_OPTIONS below.
export const ROLE_OPTIONS = [{ value: "user", label: "User" }, ...ADMIN_ROLE_OPTIONS];
export const ROLE_ENUM = ["user", ...ADMIN_ROLES] as const;

// What a not-yet-invited visitor is allowed to pick on the public
// registration form: "user" only. Platform admin roles are assigned solely
// through the admin invite flow (RegisterForm renders this field disabled
// either way) — never render ADMIN_ROLE_OPTIONS as public, selectable
// choices, or a public signup could request a platform role directly.
export const PUBLIC_ROLE_OPTIONS = [{ value: "user", label: "User" }];

export const USER_TYPE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "business_provider", label: "Business Provider" },
  { value: "both", label: "Both" },
];
export const USER_TYPE_ENUM = [
  "customer",
  "business_provider",
  "both",
] as const;

export const STATUS_OPTIONS = [];
export const STATUS_ENUM = [
  "active",
  "pending",
  "inactive",
  "suspended",
] as const;

export const FACILITY_STATUS_ENUM = [
  "pending",
  "active",
  "rejected",
  "inactive",
] as const;

export const FACILITY_REQUIREMENTS = {
  "hospital_/_clinic": {
    amenities: [
      "Emergency Room",
      "Pharmacy",
      "Waiting Area",
      "Parking Lot",
      "Security",
      "Ambulance Service",
      "Operating Theater",
      "Inpatient Wards",
      "Maternity Wing",
      "Cafeteria",
      "ATM center",
      "Credit/Debit card accepted",
    ],
    services: [
      "NHIS Accepted",
      "Genetic counseling",
      "Pharmacy",
      "Intensive care medicine",
      "Dental services",
      "Outpatient services",
      "Inpatient care",
      "Mental health",
      "Physiotherapy",
      "Community health",
      "Diagnostic services",
      "Accidents & Emergency care",
      "Health insurance coverage",
      "Laboratory",
      "Gynecology",
      "Hospice care",
      "Maternity",
      "Nursing",
      "Paediatric services",
      "Child Health",
      "Surgical Department",
      "Family medicine/ Polyclinic",
      "Obstetrics and Gynecology",
      "Dietherapy",
      "Psychiatry",
      "Radiology",
      "Eye center",
      "Anaesthesia and Pain",
      "Trauma and Orthopedics",
      "Cardiothoracic center",
      "Radiotherapy",
      "Neurosurgery",
      "Spine Health",
      "Renal Dialysis",
      "Ophthalmology",
      "Maxillofacial services",
      "Mortuary Service",
      "Sleep medicine service",
      "Diabetes wellness service",
      "Health Education & Outreach",
      "Infusion clinic",
      "Therapy/ Rehabilitation Service",
      "Wound care Clinic",
      "Pediatrics",
      "Obstetrics & Gynecology",
      "Orthopedic",
      "Nephrology (including Dialysis Service)",
      "Ear, Nose and Throat (ENT)",
      "General /Vascular Surgery Clinic",
      "Plastic Surgery clinic",
      "Clinical Psychology",
      "Urology",
      "Physician Specialist",
      "Gastroenterology",
      "Endocrinology/Diabetology",
      "Dermatology (Skin Disease)",
      "Infectiology (Infectious Disease)",
      "Hematology",
      "Pulmonology",
      "Cardiology Services",
      "Catheterization Laboratory",
      "Allied Health Services",
      "Theatre",
      "Radiology Services",
      "Gastroscopy Procedures",
    ],
  },
  herbal_center: {
    amenities: [
      "Consultation Rooms",
      "Herbal Pharmacy",
      "Treatment Garden",
      "Waiting Lounge",
      "Traditional Healing Area",
      "Processing Unit",
      "Credit/Debit card accepted",
    ],
    services: [
      "Herbal Consultations",
      "Holistic Healing",
      "Traditional Medicine Dispensing",
      "Nutritional Counseling",
      "Detoxification Programs",
      "Acupuncture",
    ],
  },
  diagnostic_lab: {
    amenities: [
      "Phlebotomy Station",
      "Sample Collection Room",
      "Waiting Area",
      "Modern Lab Equipment",
      "Wheelchair Access",
      "Secure Data Storage",
      "Credit/Debit card accepted",
    ],
    services: [
      "Blood Testing",
      "Microbiology",
      "Imaging (X-Ray/Ultrasound)",
      "ECG",
      "Biopsy Analysis",
      "DNA Testing",
      "Urinalysis",
      "Pathology Services",
    ],
  },
  pharmacy: {
    amenities: [
      "Medication Storage (Cold Chain)",
      "Consultation Desk",
      "Waiting Area",
      "Security",
      "Credit/Debit card accepted",
      "Delivery",
    ],
    services: [
      "Prescription Dispensing",
      "Over-the-Counter Advice",
      "Blood Pressure Monitoring",
      "Blood Sugar Testing",
      "Vaccination Services",
      "Medication Review",
      "First Aid Supplies",
    ],
  },
  dental_clinic: {
    amenities: [
      "Dental Chairs",
      "Sterilization Room",
      "X-Ray Room (Ondontogram)",
      "Recovery Area",
      "Patient Restrooms",
      "Waiting Lounge",
      "Credit/Debit card accepted",
    ],
    services: [
      "Teeth Whitening",
      "Root Canal Therapy",
      "Dental Implants",
      "Orthodontics (Braces)",
      "Scaling and Polishing",
      "Tooth Extraction",
      "Pediatric Dentistry",
    ],
  },
  home: {
    amenities: [
      "Private Bedrooms",
      "Communal Dining Area",
      "Disability Ramps",
      "Medical Alert Systems",
      "Outdoor Garden",
      "Laundry Service",
      "Safety Handrails",
      "Credit/Debit card accepted",
    ],
    services: [
      "Palliative Care",
      "24/7 Nursing Support",
      "Physiotherapy",
      "Social Activities",
      "Medication Management",
      "Nutritional Support",
      "Assisted Living",
    ],
  },
  eye_clinic: {
    amenities: [
      "Optical Shop",
      "Dark Room for Exams",
      "Autorefractor Station",
      "Testing Lane",
      "Waiting Area",
      "Surgical Suite",
      "Credit/Debit card accepted",
    ],
    services: [
      "Eye Examinations",
      "Cataract Surgery",
      "Glaucoma Screening",
      "Prescription Glasses",
      "Contact Lens Fitting",
      "Refractive Surgery",
      "Pediatric Ophthalmology",
    ],
  },
  osteopathy_center: {
    amenities: [
      "Adjustment Tables",
      "Private Treatment Rooms",
      "Exercise Area",
      "Waiting Room",
      "Anatomical Models",
      "Sanitation Stations",
      "Credit/Debit card accepted",
    ],
    services: [
      "Manual Therapy",
      "Postural Assessment",
      "Sports Injury Treatment",
      "Joint Mobilization",
      "Soft Tissue Massage",
      "Corrective Exercises",
    ],
  },
  physiotherapy_center: {
    amenities: [
      "Rehabilitation Gym",
      "Hydrotherapy Pool",
      "Massage Tables",
      "Ultrasound Equipment",
      "Parallel Bars",
      "Cryotherapy Units",
      "Credit/Debit card accepted",
    ],
    services: [
      "Stroke Rehabilitation",
      "Orthopedic Recovery",
      "Sports Physiotherapy",
      "Pain Management",
      "Posture Correction",
      "Electrotherapy",
      "Geriatric Rehab",
    ],
  },
  prosthetics_center: {
    amenities: [
      "Fitting Rooms",
      "Fabrication Workshop",
      "Gait Analysis Track",
      "3D Scanning Lab",
      "Waiting Area",
      "Showroom",
      "Credit/Debit card accepted",
    ],
    services: [
      "Artificial Limb Fitting",
      "Orthotic Bracing",
      "Gait Training",
      "Custom Prosthetic Design",
      "Repairs and Maintenance",
      "Pediatric Orthotics",
    ],
  },
  psychiatric_center: {
    amenities: [
      "Counseling Rooms",
      "Group Therapy Hall",
      "Quiet Rooms",
      "Secure Inpatient Wards",
      "Recreational Area",
      "Visitor Room",
      "Credit/Debit card accepted",
    ],
    services: [
      "Psychological Assessment",
      "Crisis Intervention",
      "Cognitive Behavioral Therapy (CBT)",
      "Medication Management",
      "Substance Abuse Counseling",
      "Occupational Therapy",
      "Family Counseling",
    ],
  },
  health_school: {
    amenities: [
      "Students Hostel",
      "Science & ICT Labs",
      "Wifi",
      "Demonstration Rooms",
      "Lecture Halls",
      "House of Anatomy",
      "Library Complex",
      "Cafeteria",
      "Ancilliary facilities",
      "Family Health Hospital",
      "Sports Facilities",
      "Credit/Debit card accepted",
    ],
    services: [
      "Foundation Diploma",
      "Bachelor Degrees",
      "Bachelor of Medicine",
      "Bachelor of Surgery",
      "Master of Science(Nursing-Midwifery)",
      "Health Professions Education",
      "Public Health",
      "Mental Health",
      "Paediatrics",
      "Radiography",
      "Nurse Practitioner",
    ],
  },
  personal_trainer: {
    amenities: [
      "Home Visits",
      "Online Coaching",
      "Personal Gym Access",
      "Nutrition Consultation Room",
      "Credit/Debit card accepted",
    ],
    services: [
      "Body Building",
      "Nutrition Planning",
      "Strength Growth",
      "Weight Loss",
      "Yoga & Flexibility",
      "Cardio Training",
      "Sports Specific Training",
    ],
  },
  wellness_center: {
    amenities: [
      "Fitness & Cardio machines",
      "Weight training areas",
      "Specialized spaces",
      "Yoga studios",
      "Meditation rooms",
      "Spa & Recovery facilities",
      "Therapeutic massage",
      "Aquatics & Relaxation facilities",
    ],
    services: [
      "General Wellness",
      "Corporate Wellness",
      "Chiropractic",
      "Massage Therapy",
      "Facial & Skin Care",
      "Nail & Foot Care",
      "Outcall / Home Services",
      "Personalized Coaching",
      "Cardio & Strength Training",
      "Group Fitness",
      "Health & Nutritional Support",
    ],
  },
};
export const FACILITY_TYPE_OPTIONS = [
  { value: "hospital_/_clinic", label: "Hospitals / Clinics" },
  { value: "herbal_center", label: "Herbal Centers" },
  { value: "diagnostic_lab", label: "Diagnostic Labs" },
  { value: "pharmacy", label: "Pharmacies" },
  { value: "dental_clinic", label: "Dental Clinics" },
  { value: "home", label: "Homes" },
  { value: "eye_clinic", label: "Eye Clinics" },
  { value: "osteopathy_center", label: "Osteopathy Centers" },
  { value: "physiotherapy_center", label: "Physiotherapy Centers" },
  { value: "prosthetics_center", label: "Prosthetics Centers" },
  { value: "psychiatric_center", label: "Psychiatric Centers" },
  { value: "ibp", label: "IBPS" },
  { value: "health_school", label: "Health Schools" },
  { value: "wellness_center", label: "Wellness (Gym/Spa)" },
];
export const FACILITY_TYPE_ENUM = [
  "hospital_/_clinic",
  "herbal_center",
  "diagnostic_lab",
  "pharmacy",
  "dental_clinic",
  "home",
  "eye_clinic",
  "osteopathy_center",
  "physiotherapy_center",
  "prosthetics_center",
  "psychiatric_center",
  "ibp",
  "health_school",
  "wellness_center",
  "personal_trainer",
] as const;

export const GHANA_REGIONS_ENUM = [
  "ahafo",
  "ashanti",
  "bono",
  "bono east",
  "central",
  "eastern",
  "greater accra",
  "north east",
  "northern",
  "oti",
  "savannah",
  "upper east",
  "upper west",
  "volta",
  "western",
  "western north",
] as const;

export const DEFAULT_BUSINESS_HOURS: BusinessDay[] = [
  { day: "Monday", open: "08:00", close: "17:00", isClosed: false },
  { day: "Tuesday", open: "08:00", close: "17:00", isClosed: false },
  { day: "Wednesday", open: "08:00", close: "17:00", isClosed: false },
  { day: "Thursday", open: "08:00", close: "17:00", isClosed: false },
  { day: "Friday", open: "08:00", close: "17:00", isClosed: false },
  { day: "Saturday", open: "09:00", close: "13:00", isClosed: true }, // Default weekends to closed
  { day: "Sunday", open: "09:00", close: "13:00", isClosed: true },
];

////////////////// MARKETING RELATED
export const MARKETING_TYPE_OPTIONS = [
  { value: "ads", label: "Ads" },
  { value: "events", label: "Events" },
  { value: "news", label: "News" },
  { value: "health", label: "Health" },
  { value: "other", label: "Other" },
];
export const MARKETING_TYPE_ENUM = [
  "ads",
  "events",
  "news",
  "health",
  "other",
] as const;
export const MARKETING_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
];
export const MARKETING_STATUS_ENUM = [
  "draft",
  "scheduled",
  "live",
  "paused",
  "ended",
] as const;
export const MARKETING_CTA_OPTIONS = [
  { value: "apply_now", label: "Apply Now" },
  { value: "contact_us", label: "Contact Us" },
  { value: "get_offer", label: "Get offer" },
  { value: "book_now", label: "Book Now" },
  { value: "donate_now", label: "Donate Now" },
  { value: "get_quote", label: "Get Quote" },
  { value: "like_page", label: "Like Page" },
  { value: "call_now", label: "Call Now" },
  { value: "get_directions", label: "Get Directions" },
  { value: "install_now", label: "Install Now" },
  { value: "learn_more", label: "Learn More" },
  { value: "listen_now", label: "Listen Now" },
  { value: "open_link", label: "Open Link" },
  { value: "order_now", label: "Order Now" },
  { value: "play_game", label: "Play Game" },
  { value: "request_time", label: "Request Time" },
  { value: "save", label: "Save" },
  { value: "see_menu", label: "See Menu" },
  { value: "send_message", label: "Send Message" },
  { value: "send_whatsapp_message", label: "Send WhatsApp Message" },
  { value: "shop_now", label: "Shop Now" },
  { value: "sign_up", label: "Sign Up" },
  { value: "subscribe", label: "Subscribe" },
  { value: "use_app", label: "Use App" },
  { value: "view_event", label: "View Event" },
  { value: "watch_more", label: "Watch More" },
];
export const CTA_CONFIG = {
  apply_now: {
    label: "Form Link",
    type: "single",
    placeholder: "https://form.link",
  }, //
  book_now: {
    label: "Form Link",
    type: "single",
    placeholder: "https://booking.link",
  }, //
  call_now: {
    label: "Contact Numbers",
    type: "multi",
    fields: ["Phone 1", "Phone 2"],
  }, //
  contact_us: {
    label: "Contact Details",
    type: "multi",
    fields: ["Phone", "Email", "WhatsApp"],
  }, //
  donate_now: {
    label: "Donation Link",
    type: "single",
    placeholder: "https://donate.link",
  }, //
  get_directions: {
    label: "Map Link",
    type: "single",
    placeholder: "https://maps.google.com/...",
  }, //
  get_offer: {
    label: "Offer Link",
    type: "single",
    placeholder: "https://offer.link",
  }, //
  get_quote: {
    label: "Quote Link",
    type: "single",
    placeholder: "https://quote.link",
  }, //
  install_now: {
    label: "App Links",
    type: "multi",
    fields: ["iOS Link", "Android Link", "Other Link"],
  }, //
  learn_more: {
    label: "Page Link",
    type: "single",
    placeholder: "https://info.link",
  }, //
  like_page: {
    label: "Social Links",
    type: "multi",
    fields: ["Instagram", "Facebook", "X", "Tiktok", "Snapchat", "Website"],
  }, //
  listen_now: {
    label: "Audio Link",
    type: "single",
    placeholder: "https://audio.link",
  }, //
  open_link: {
    label: "Link",
    type: "single",
    placeholder: "https://open.link",
  }, //
  order_now: {
    label: "Product Page",
    type: "single",
    placeholder: "https://shop.link/product",
  }, //
  play_game: {
    label: "Game Link",
    type: "single",
    placeholder: "https://game.link",
  }, //
  request_time: {
    label: "Page Link",
    type: "single",
    placeholder: "https://request.link",
  }, //
  save: {
    label: "Save Link",
    type: "single",
    placeholder: "https://save.link",
  }, //
  see_menu: {
    label: "Menu Link",
    type: "single",
    placeholder: "https://menu.link",
  }, //
  send_message: {
    label: "Message Link",
    type: "single",
    placeholder: "https://message.link",
  }, //
  send_whatsapp_message: {
    label: "WhatsApp Number",
    type: "single",
    placeholder: "e.g., +233...",
  }, //
  shop_now: {
    label: "Products Page",
    type: "single",
    placeholder: "https://shop.link",
  }, //
  sign_up: {
    label: "Form Link",
    type: "single",
    placeholder: "https://signup.link",
  }, //
  subscribe: {
    label: "Page Link",
    type: "single",
    placeholder: "https://subscribe.link",
  }, //
  use_app: {
    label: "App Links",
    type: "multi",
    fields: ["iOS Link", "Android Link", "Other Link"],
  }, //
  view_event: {
    label: "Page Link",
    type: "single",
    placeholder: "https://event.link",
  }, //
  watch_more: {
    label: "Video Page",
    type: "single",
    placeholder: "https://video.link",
  }, //
} as const;
// the relationsship between role and user type for permissions
// Super Admin -> both
// Admin -> both but with only ability to view not edit/delete
// Registrar -> customer
// USer -> customer
