import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { getAdminClient } from "../lib/db/admin";

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const diseaseMapping = {
  "Aplastic anaemia": {
    isSystemic: true,
    bodyParts: ["Bone Marrow", "Immune and Lymphatic"],
  },
  "Achilles tendinopathy": {
    isSystemic: false,
    bodyParts: ["Foot and Toes", "Lower Leg and Ankle"],
  },
  Acne: { isSystemic: false, bodyParts: ["Skull and Face"] },
  "Acute cholecystitis": {
    isSystemic: false,
    bodyParts: ["Liver and Biliary Tract"],
  },
  "Acute lymphoblastic leukaemia": {
    isSystemic: true,
    bodyParts: ["Bone Marrow", "Immune and Lymphatic"],
  },
  "Acute myeloid leukaemia": {
    isSystemic: true,
    bodyParts: ["Bone Marrow", "Immune and Lymphatic"],
  },
  "Acute pancreatitis": { isSystemic: false, bodyParts: ["Pancreas"] },
  "Addison's disease": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Alzheimer's disease": { isSystemic: true, bodyParts: ["Head and Neck"] },
  "Anal cancer": { isSystemic: false, bodyParts: ["Rectum and Anus"] },
  Anaphylaxis: { isSystemic: true, bodyParts: ["Immune and Lymphatic"] },
  Angina: { isSystemic: false, bodyParts: ["Heart"] },
  "Ankle sprain": { isSystemic: false, bodyParts: ["Lower Leg and Ankle"] },
  "Ankle avulsion fracture": {
    isSystemic: false,
    bodyParts: ["Lower Leg and Ankle"],
  },
  "Ankylosing spondylitis (AS)": {
    isSystemic: true,
    bodyParts: ["Spine and Axial Skeleton", "Sacrum and Pelvis"],
  },
  "Aplastic anaemia in children and young people": {
    isSystemic: true,
    bodyParts: ["Bone Marrow", "Immune and Lymphatic"],
  },
  Arthritis: { isSystemic: true, bodyParts: ["Musculoskeletal System"] },
  Asthma: {
    isSystemic: false,
    bodyParts: ["Lungs and Pleura", "Trachea and Bronchi"],
  },
  "Atopic eczema": { isSystemic: true, bodyParts: ["Immune and Lymphatic"] },
  "Attention deficit hyperactivity disorder (ADHD)": {
    isSystemic: true,
    bodyParts: ["Head and Neck"],
  },
  "Bacterial vaginosis": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Benign prostate enlargement": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Bile duct cancer": {
    isSystemic: false,
    bodyParts: ["Liver and Biliary Tract"],
  },
  "Binge eating disorder": { isSystemic: true, bodyParts: ["Head and Neck"] },
  "Bipolar disorder": { isSystemic: true, bodyParts: ["Head and Neck"] },
  "Bladder cancer": { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  Sepsis: {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Systemic Arteries", "Systemic Veins"],
  },
  "Bone cancer": { isSystemic: false, bodyParts: ["Musculoskeletal System"] },
  "Bottom shuffling in young children": {
    isSystemic: false,
    bodyParts: ["Lower Extremities"],
  },
  "Bowel incontinence": { isSystemic: false, bodyParts: ["Rectum and Anus"] },
  "Bow legs and knock knees in children and young people": {
    isSystemic: false,
    bodyParts: ["Lower Extremities", "Knee Joint"],
  },
  "Brain tumours": { isSystemic: false, bodyParts: ["Head and Neck"] },
  "Breast cancer in men": {
    isSystemic: false,
    bodyParts: ["Thoracic Spine (Mid-back)"],
  },
  "Shortness of breath": {
    isSystemic: true,
    bodyParts: ["Lungs and Pleura", "Heart"],
  },
  Bronchitis: {
    isSystemic: false,
    bodyParts: ["Trachea and Bronchi", "Lungs and Pleura"],
  },
  Cellulitis: { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Cerebral palsy": {
    isSystemic: true,
    bodyParts: ["Head and Neck", "Musculoskeletal System"],
  },
  "Cervical cancer": { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Cervical spondylosis": {
    isSystemic: false,
    bodyParts: ["Cervical Spine (Neck)"],
  },
  "Chest and rib injury": {
    isSystemic: false,
    bodyParts: ["Thoracic Spine (Mid-back)", "Spine and Axial Skeleton"],
  },
  "Chest infection": {
    isSystemic: false,
    bodyParts: ["Lungs and Pleura", "Trachea and Bronchi"],
  },
  Chickenpox: { isSystemic: true, bodyParts: ["Immune and Lymphatic"] },
  Chilblains: {
    isSystemic: false,
    bodyParts: ["Foot and Toes", "Hand and Fingers"],
  },
  "ME or CFS": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Head and Neck"],
  },
  "Chronic lymphocytic leukaemia": {
    isSystemic: true,
    bodyParts: ["Bone Marrow", "Immune and Lymphatic"],
  },
  "Chronic obstructive pulmonary disease (COPD)": {
    isSystemic: false,
    bodyParts: ["Lungs and Pleura", "Trachea and Bronchi"],
  },
  Cirrhosis: { isSystemic: false, bodyParts: ["Liver and Biliary Tract"] },
  "Clostridium difficile": {
    isSystemic: false,
    bodyParts: ["Small and Large Intestine"],
  },
  "Cold sore": {
    isSystemic: false,
    bodyParts: ["Mouth and Jaw", "Skull and Face"],
  },
  "Common cold": {
    isSystemic: false,
    bodyParts: ["Upper Airways (Nose/Throat)", "Nose and Sinuses"],
  },
  "Complications of type 1 diabetes": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Systemic Arteries", "Eyes and Vision"],
  },
  Concussion: {
    isSystemic: false,
    bodyParts: ["Head and Neck", "Skull and Face"],
  },
  "Congenital heart conditions": { isSystemic: false, bodyParts: ["Heart"] },
  "Congenital muscular dystrophy": {
    isSystemic: true,
    bodyParts: ["Musculoskeletal System"],
  },
  Conjunctivitis: { isSystemic: false, bodyParts: ["Eyes and Vision"] },
  Constipation: {
    isSystemic: false,
    bodyParts: ["Small and Large Intestine", "Rectum and Anus"],
  },
  "Coronary heart disease": {
    isSystemic: false,
    bodyParts: ["Coronary Arteries", "Heart"],
  },
  Cough: {
    isSystemic: false,
    bodyParts: ["Throat and Pharynx", "Trachea and Bronchi"],
  },
  "Crohn's disease": {
    isSystemic: true,
    bodyParts: [
      "Small and Large Intestine",
      "Esophagus and Upper GI",
      "Stomach",
    ],
  },
  Croup: {
    isSystemic: false,
    bodyParts: ["Throat and Pharynx", "Trachea and Bronchi"],
  },
  "Cystic fibrosis": {
    isSystemic: true,
    bodyParts: ["Lungs and Pleura", "Pancreas", "Digestive and Metabolic"],
  },
  Cystitis: { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  Deafblindness: {
    isSystemic: true,
    bodyParts: ["Ears and Hearing", "Eyes and Vision"],
  },
  "Deep vein thrombosis (DVT)": {
    isSystemic: false,
    bodyParts: ["Systemic Veins", "Lower Extremities"],
  },
  "Degenerative cervical myelopathy": {
    isSystemic: false,
    bodyParts: ["Cervical Spine (Neck)", "Spine and Axial Skeleton"],
  },
  Delirium: { isSystemic: true, bodyParts: ["Head and Neck"] },
  "Dental abscess": { isSystemic: false, bodyParts: ["Mouth and Jaw"] },
  "Dermatitis herpetiformis": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Small and Large Intestine"],
  },
  "Diabetic ketoacidosis (DKA)": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Systemic Arteries"],
  },
  "Discoid eczema": { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Duchenne muscular dystrophy (DMD)": {
    isSystemic: true,
    bodyParts: ["Musculoskeletal System", "Heart"],
  },
  "Living with dysfibrinogenemia": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Systemic Arteries"],
  },
  "Eating disorders": {
    isSystemic: true,
    bodyParts: ["Head and Neck", "Digestive and Metabolic"],
  },
  "Ebola virus disease": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Systemic Arteries", "Systemic Veins"],
  },
  "Elbow (radial head or neck) fracture": {
    isSystemic: false,
    bodyParts: ["Elbow Joint", "Upper Arm (Humerus)", "Forearm and Wrist"],
  },
  "Edwards' syndrome": {
    isSystemic: true,
    bodyParts: ["Head and Neck", "Heart", "Musculoskeletal System"],
  },
  "Emery-Dreifuss muscular dystrophy (EDMD)": {
    isSystemic: true,
    bodyParts: ["Musculoskeletal System", "Heart"],
  },
  Epilepsy: { isSystemic: true, bodyParts: ["Head and Neck"] },
  "Erectile dysfunction": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Escherichia coli (E. coli) O157": {
    isSystemic: false,
    bodyParts: ["Small and Large Intestine", "Digestive and Metabolic"],
  },
  "Ewing sarcoma": {
    isSystemic: false,
    bodyParts: ["Musculoskeletal System", "Bone Marrow"],
  },
  "Excessive sweating (hyperhidrosis)": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Facioscapulohumeral muscular dystrophy (FSHD)": {
    isSystemic: true,
    bodyParts: [
      "Musculoskeletal System",
      "Skull and Face",
      "Shoulder and Clavicle",
    ],
  },
  "Febrile seizures": { isSystemic: false, bodyParts: ["Head and Neck"] },
  "Fever in adults": { isSystemic: true, bodyParts: ["Immune and Lymphatic"] },
  Fibromyalgia: {
    isSystemic: true,
    bodyParts: ["Musculoskeletal System", "Immune and Lymphatic"],
  },
  "Food poisoning": {
    isSystemic: false,
    bodyParts: ["Stomach", "Small and Large Intestine"],
  },
  "Frozen shoulder": {
    isSystemic: false,
    bodyParts: ["Shoulder and Clavicle"],
  },
  "Gallbladder cancer": {
    isSystemic: false,
    bodyParts: ["Liver and Biliary Tract"],
  },
  "Ganglion cyst": {
    isSystemic: false,
    bodyParts: ["Hand and Fingers", "Forearm and Wrist", "Foot and Toes"],
  },
  "Gastroenteritis in adults": {
    isSystemic: false,
    bodyParts: ["Stomach", "Small and Large Intestine"],
  },
  "Gastroesophageal reflux disease": {
    isSystemic: false,
    bodyParts: ["Esophagus and Upper GI", "Stomach"],
  },
  "Genital herpes": { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Genital warts": { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Golfers elbow": { isSystemic: false, bodyParts: ["Elbow Joint"] },
  Gout: {
    isSystemic: true,
    bodyParts: ["Foot and Toes", "Musculoskeletal System"],
  },
  "Gum disease": { isSystemic: false, bodyParts: ["Mouth and Jaw"] },
  "Head and neck cancer": {
    isSystemic: false,
    bodyParts: ["Head and Neck", "Throat and Pharynx", "Mouth and Jaw"],
  },
  "Hearing loss": { isSystemic: false, bodyParts: ["Ears and Hearing"] },
  "Heart block": {
    isSystemic: false,
    bodyParts: ["Heart", "Myocardium (Muscle)"],
  },
  "Hepatitis C": {
    isSystemic: true,
    bodyParts: ["Liver and Biliary Tract", "Immune and Lymphatic"],
  },
  "Hiatus hernia": {
    isSystemic: false,
    bodyParts: ["Esophagus and Upper GI", "Stomach"],
  },
  "High blood pressure (hypertension)": {
    isSystemic: true,
    bodyParts: ["Systemic Arteries", "Heart"],
  },
  "High cholesterol": {
    isSystemic: true,
    bodyParts: ["Systemic Arteries", "Liver and Biliary Tract"],
  },
  "Hip problems in children and young people": {
    isSystemic: false,
    bodyParts: ["Hip and Pelvic Girdle"],
  },
  HIV: { isSystemic: true, bodyParts: ["Immune and Lymphatic"] },
  Hives: { isSystemic: true, bodyParts: ["Immune and Lymphatic"] },
  "Hodgkin lymphoma": {
    isSystemic: true,
    bodyParts: ["Lymph Nodes and Vessels", "Immune and Lymphatic", "Spleen"],
  },
  Hydrocephalus: {
    isSystemic: false,
    bodyParts: ["Head and Neck", "Skull and Face"],
  },
  "Hypoglycaemia (low blood sugar)": {
    isSystemic: true,
    bodyParts: ["Pancreas", "Digestive and Metabolic"],
  },
  "Idiopathic pulmonary fibrosis (IPF)": {
    isSystemic: false,
    bodyParts: ["Lungs and Pleura"],
  },
  Impetigo: { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  Insomnia: { isSystemic: true, bodyParts: ["Head and Neck"] },
  Labyrinthitis: { isSystemic: false, bodyParts: ["Ears and Hearing"] },
  "Laryngeal (larynx) cancer": {
    isSystemic: false,
    bodyParts: ["Throat and Pharynx"],
  },
  "Legionnaires' disease": {
    isSystemic: false,
    bodyParts: ["Lungs and Pleura", "Respiratory System"],
  },
  "Limb girdle muscular dystrophy (LGMD)": {
    isSystemic: true,
    bodyParts: [
      "Musculoskeletal System",
      "Hip and Pelvic Girdle",
      "Shoulder and Clavicle",
    ],
  },
  "Liver disease": {
    isSystemic: false,
    bodyParts: ["Liver and Biliary Tract"],
  },
  "Lung cancer": { isSystemic: false, bodyParts: ["Lungs and Pleura"] },
  Lupus: {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Musculoskeletal System", "Heart"],
  },
  "Lyme disease": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Musculoskeletal System", "Heart"],
  },
  Lymphoedema: {
    isSystemic: false,
    bodyParts: ["Lymph Nodes and Vessels", "Immune and Lymphatic"],
  },
  "Lymphogranuloma venereum (LGV)": {
    isSystemic: false,
    bodyParts: ["Lymph Nodes and Vessels", "Immune and Lymphatic"],
  },
  Malaria: {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Liver and Biliary Tract", "Spleen"],
  },
  Malnutrition: { isSystemic: true, bodyParts: ["Digestive and Metabolic"] },
  Measles: {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Upper Airways (Nose/Throat)"],
  },
  Meningitis: {
    isSystemic: true,
    bodyParts: [
      "Head and Neck",
      "Spine and Axial Skeleton",
      "Immune and Lymphatic",
    ],
  },
  Mesothelioma: { isSystemic: false, bodyParts: ["Lungs and Pleura"] },
  "Middle ear infection (otitis media)": {
    isSystemic: false,
    bodyParts: ["Ears and Hearing"],
  },
  "Minor head injury": {
    isSystemic: false,
    bodyParts: ["Head and Neck", "Skull and Face"],
  },
  "Molar pregnancy": { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Mouth cancer": { isSystemic: false, bodyParts: ["Mouth and Jaw"] },
  "Mouth ulcer": { isSystemic: false, bodyParts: ["Mouth and Jaw"] },
  Myeloma: {
    isSystemic: true,
    bodyParts: [
      "Bone Marrow",
      "Immune and Lymphatic",
      "Spine and Axial Skeleton",
    ],
  },
  "Multiple sclerosis (MS)": {
    isSystemic: true,
    bodyParts: [
      "Head and Neck",
      "Spine and Axial Skeleton",
      "Immune and Lymphatic",
    ],
  },
  "Multiple system atrophy (MSA)": {
    isSystemic: true,
    bodyParts: ["Head and Neck", "Spine and Axial Skeleton"],
  },
  Mumps: {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Mouth and Jaw", "Throat and Pharynx"],
  },
  "Munchausen's syndrome": { isSystemic: true, bodyParts: ["Head and Neck"] },
  "Muscular dystrophy (MD)": {
    isSystemic: true,
    bodyParts: ["Musculoskeletal System"],
  },
  "Mycoplasma genitalium (Mgen)": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Nasal and sinus cancer": {
    isSystemic: false,
    bodyParts: ["Nose and Sinuses"],
  },
  "Neck injury": {
    isSystemic: false,
    bodyParts: ["Cervical Spine (Neck)", "Head and Neck"],
  },
  "Neuroendocrine tumours": {
    isSystemic: true,
    bodyParts: ["Digestive and Metabolic", "Lungs and Pleura", "Pancreas"],
  },
  "Non-Hodgkin lymphoma": {
    isSystemic: true,
    bodyParts: ["Lymph Nodes and Vessels", "Immune and Lymphatic", "Spleen"],
  },
  Nosebleed: { isSystemic: false, bodyParts: ["Nose and Sinuses"] },
  "Oculopharyngeal muscular dystrophy (OPMD)": {
    isSystemic: true,
    bodyParts: [
      "Eyes and Vision",
      "Throat and Pharynx",
      "Musculoskeletal System",
    ],
  },
  "Oral thrush in adults": { isSystemic: false, bodyParts: ["Mouth and Jaw"] },
  "Osteoarthritis of the hand": {
    isSystemic: false,
    bodyParts: ["Hand and Fingers", "Musculoskeletal System"],
  },
  "Overactive thyroid": {
    isSystemic: true,
    bodyParts: ["Thyroid and Parathyroid", "Immune and Lymphatic"],
  },
  "Patau's syndrome": {
    isSystemic: true,
    bodyParts: ["Head and Neck", "Heart", "Musculoskeletal System"],
  },
  "Patellofemoral pain syndrome": {
    isSystemic: false,
    bodyParts: ["Knee Joint", "Lower Extremities"],
  },
  "Pelvic inflammatory disease": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic", "Sacrum and Pelvis"],
  },
  "Pelvic organ prolapse": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic", "Sacrum and Pelvis"],
  },
  "Penile cancer": { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Peripheral neuropathy": {
    isSystemic: true,
    bodyParts: ["Lower Extremities", "Upper Extremities"],
  },
  "Personality disorder": { isSystemic: true, bodyParts: ["Head and Neck"] },
  "Perthes' disease": {
    isSystemic: false,
    bodyParts: ["Hip and Pelvic Girdle"],
  },
  "Plantar heel pain": { isSystemic: false, bodyParts: ["Foot and Toes"] },
  Pneumonia: {
    isSystemic: false,
    bodyParts: ["Lungs and Pleura", "Respiratory System"],
  },
  "Polymyalgia rheumatica": {
    isSystemic: true,
    bodyParts: [
      "Shoulder and Clavicle",
      "Hip and Pelvic Girdle",
      "Musculoskeletal System",
    ],
  },
  "Post-polio syndrome": {
    isSystemic: true,
    bodyParts: ["Musculoskeletal System", "Head and Neck"],
  },
  "Positional talipes in children and young people": {
    isSystemic: false,
    bodyParts: ["Foot and Toes"],
  },
  "Progressive supranuclear palsy (PSP)": {
    isSystemic: true,
    bodyParts: ["Head and Neck", "Eyes and Vision"],
  },
  Psoriasis: { isSystemic: true, bodyParts: ["Immune and Lymphatic"] },
  Psychosis: { isSystemic: true, bodyParts: ["Head and Neck"] },
  "Rare cancers": { isSystemic: true, bodyParts: ["Immune and Lymphatic"] },
  "Reactive arthritis": {
    isSystemic: true,
    bodyParts: ["Musculoskeletal System", "Immune and Lymphatic"],
  },
  "Respiratory syncytial virus (RSV)": {
    isSystemic: false,
    bodyParts: ["Upper Airways (Nose/Throat)", "Lungs and Pleura"],
  },
  "Rheumatoid arthritis": {
    isSystemic: true,
    bodyParts: [
      "Hand and Fingers",
      "Foot and Toes",
      "Musculoskeletal System",
      "Immune and Lymphatic",
    ],
  },
  Ringworm: { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  Rosacea: { isSystemic: false, bodyParts: ["Skull and Face"] },
  Scabies: { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Scarlet fever": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Throat and Pharynx"],
  },
  Schizophrenia: { isSystemic: true, bodyParts: ["Head and Neck"] },
  Sciatica: {
    isSystemic: false,
    bodyParts: [
      "Lumbar Spine (Lower-back)",
      "Sacrum and Pelvis",
      "Lower Extremities",
    ],
  },
  "Seasonal affective disorder (SAD)": {
    isSystemic: true,
    bodyParts: ["Head and Neck"],
  },
  "Severe head injury": {
    isSystemic: false,
    bodyParts: ["Head and Neck", "Skull and Face"],
  },
  Shingles: {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Spine and Axial Skeleton"],
  },
  "Living with sickle cell anaemia": {
    isSystemic: true,
    bodyParts: ["Bone Marrow", "Immune and Lymphatic", "Spleen"],
  },
  "Sjögren's disease": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Eyes and Vision", "Mouth and Jaw"],
  },
  "Skin cancer": { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Skin rashes in children": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Slipped upper femoral epiphysis (SUFE) in children and young people": {
    isSystemic: false,
    bodyParts: ["Hip and Pelvic Girdle", "Thigh (Femur)"],
  },
  "Social anxiety disorder": { isSystemic: true, bodyParts: ["Head and Neck"] },
  "Sore throat": { isSystemic: false, bodyParts: ["Throat and Pharynx"] },
  Stillbirth: { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Stomach cancer": { isSystemic: false, bodyParts: ["Stomach"] },
  "Streptococcus A (Strep A)": {
    isSystemic: true,
    bodyParts: ["Throat and Pharynx", "Immune and Lymphatic"],
  },
  "Subacromial pain syndrome": {
    isSystemic: false,
    bodyParts: ["Shoulder and Clavicle"],
  },
  "Sunbed and tanning safety": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Supraventricular tachycardia": { isSystemic: false, bodyParts: ["Heart"] },
  "Talking to children and teenagers about cancer": {
    isSystemic: true,
    bodyParts: ["Head and Neck"],
  },
  "Testicular cancer": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  Thrush: { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  Tinnitus: { isSystemic: false, bodyParts: ["Ears and Hearing"] },
  "Transient ischaemic attack (TIA)": {
    isSystemic: true,
    bodyParts: ["Head and Neck", "Systemic Arteries"],
  },
  "Trigger thumb or finger in children and young people": {
    isSystemic: false,
    bodyParts: ["Hand and Fingers"],
  },
  "Type 1 diabetes": {
    isSystemic: true,
    bodyParts: ["Pancreas", "Immune and Lymphatic", "Systemic Arteries"],
  },
  "Ulcerative colitis": {
    isSystemic: true,
    bodyParts: [
      "Small and Large Intestine",
      "Rectum and Anus",
      "Immune and Lymphatic",
    ],
  },
  "Urinary tract infection (UTI) in children": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Vaginal cancer": { isSystemic: false, bodyParts: ["Immune and Lymphatic"] },
  "Vaginal discharge": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Varicose eczema": {
    isSystemic: false,
    bodyParts: ["Lower Leg and Ankle", "Systemic Veins"],
  },
  "Vascular dementia": {
    isSystemic: true,
    bodyParts: ["Head and Neck", "Systemic Arteries"],
  },
  "Living with vasculitis": {
    isSystemic: true,
    bodyParts: ["Immune and Lymphatic", "Systemic Arteries", "Systemic Veins"],
  },
  "Venous leg ulcer": {
    isSystemic: false,
    bodyParts: ["Lower Leg and Ankle", "Systemic Veins"],
  },
  "Vitamin B12 & folate anaemia": {
    isSystemic: true,
    bodyParts: [
      "Bone Marrow",
      "Immune and Lymphatic",
      "Digestive and Metabolic",
    ],
  },
  "Vomiting in children and babies": {
    isSystemic: false,
    bodyParts: ["Stomach", "Digestive and Metabolic"],
  },
  "Whooping cough": {
    isSystemic: false,
    bodyParts: ["Upper Airways (Nose/Throat)", "Trachea and Bronchi"],
  },
  "Womb (uterus) cancer": {
    isSystemic: false,
    bodyParts: ["Immune and Lymphatic"],
  },
  "Yellow fever": {
    isSystemic: true,
    bodyParts: [
      "Immune and Lymphatic",
      "Liver and Biliary Tract",
      "Systemic Arteries",
    ],
  },
};

// Case-insensitive lookup so a disease name that differs only in casing
// from a diseaseMapping key still resolves (previously a silent miss).
const diseaseMappingLower = new Map<string, (typeof diseaseMapping)[keyof typeof diseaseMapping]>();
Object.entries(diseaseMapping).forEach(([name, value]) => {
  diseaseMappingLower.set(name.toLowerCase(), value as any);
});
function getResearch(diseaseName: string) {
  return diseaseMappingLower.get(diseaseName.toLowerCase());
}

// Helper function to chunk array for batch inserts
function chunkArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function seed() {
  console.log("⏳ Starting disease seeder process...");

  try {
    const client = getAdminClient();
    const seedDataPath = path.join(
      process.cwd(),
      "scripts/seed-data/disease_seed_data.json",
    );
    if (!fs.existsSync(seedDataPath)) {
      console.error("❌ Missing seed_data.json");
      process.exit(1);
    }
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, "utf8"));

    console.log("🧹 Wiping existing conditions and associations...");

    // condition_causes and condition_types also FK to conditions.id.
    // If either has rows, deleting from conditions first will fail with
    // a foreign key violation, so check and clear them first.
    const { count: causesCount } = await client
      .from("condition_causes")
      .select("id", { count: "exact", head: true });
    const { count: typesCount } = await client
      .from("condition_types")
      .select("id", { count: "exact", head: true });
    console.log(
      `   Found ${causesCount ?? 0} condition_causes rows, ${typesCount ?? 0} condition_types rows referencing conditions.`,
    );

    await client
      .from("condition_body_parts")
      .delete()
      .neq("condition_id", "00000000-0000-0000-0000-000000000000");
    await client
      .from("condition_categories")
      .delete()
      .neq("condition_id", "00000000-0000-0000-0000-000000000000");
    if (causesCount && causesCount > 0) {
      await client
        .from("condition_causes")
        .delete()
        .neq("condition_id", "00000000-0000-0000-0000-000000000000");
    }
    if (typesCount && typesCount > 0) {
      await client
        .from("condition_types")
        .delete()
        .neq("condition_id", "00000000-0000-0000-0000-000000000000");
    }
    await client
      .from("conditions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("📦 Fetching categories and body parts for lookup...");
    const { data: allCategories } = await client.from("categories").select("*");
    const { data: allBodyParts } = await client.from("body_parts").select("*");

    const categoryMap = new Map();
    allCategories?.forEach((c: any) => categoryMap.set(c.slug, c.id));

    const bodyPartNameMap = new Map();
    const bodyPartPathMap = new Map();
    allBodyParts?.forEach((bp: any) => {
      bodyPartNameMap.set(bp.name.toLowerCase(), bp);
      bodyPartPathMap.set(bp.path, bp.id);
    });

    console.log(`🦠 Seeding ${seedData.diseases_seed.length} diseases...`);

    const batchSize = 50;
    const diseaseBatches = chunkArray(seedData.diseases_seed, batchSize);

    // Track misses so incompleteness is visible instead of silent.
    const diseasesWithoutMapping = new Set<string>();
    const unmatchedCategorySlugs = new Set<string>();
    const unmatchedBodyPartNames = new Set<string>();

    for (let i = 0; i < diseaseBatches.length; i++) {
      const batch = diseaseBatches[i];

      const conditionsToInsert = batch.map((disease: any) => {
        const research = getResearch(disease.name);
        if (!research) diseasesWithoutMapping.add(disease.name);
        return {
          name: disease.name,
          slug: disease.slug,
          nhs_link: disease.nhs_link,
          image_url: disease.image_url,
          about: disease.about,
          diagnosis: disease.diagnosis,
          treatment: disease.treatment,
          complications: disease.complications,
          symptoms: disease.symptoms,
          prevention: disease.prevention,
          contact_your_doctor: disease.contact_your_doctor,
          more_information: disease.more_information,
          attribution: disease.attribution,
          is_systemic: research?.isSystemic || false,
          specialist: disease.specialist,
          status: disease.status || "published",
        };
      });

      const { data: insertedConditions, error: condError } = await client
        .from("conditions")
        .upsert(conditionsToInsert, { onConflict: "slug" })
        .select();

      if (condError) {
        console.error(
          `❌ Error inserting conditions in batch ${i + 1}:`,
          condError,
        );
        continue;
      }

      const categoryAssocs = [];
      const bodyPartAssocs = [];

      for (const inserted of insertedConditions) {
        const original = batch.find(
          (d: any) => d.slug === inserted.slug,
        ) as any;
        const research = getResearch(original.name);

        const categoryId = categoryMap.get(original.category_association_slug);
        if (categoryId) {
          categoryAssocs.push({
            condition_id: inserted.id,
            category_id: categoryId,
          });
        } else if (original.category_association_slug) {
          unmatchedCategorySlugs.add(original.category_association_slug);
        }

        if (research) {
          const associatedIds = new Set<string>();
          for (const bpName of research.bodyParts) {
            const bp = bodyPartNameMap.get(bpName.toLowerCase());
            if (bp) {
              associatedIds.add(bp.id);
              const pathParts = bp.path.split(".");
              for (let j = 1; j <= pathParts.length; j++) {
                const parentPath = pathParts.slice(0, j).join(".");
                const parentId = bodyPartPathMap.get(parentPath);
                if (parentId) associatedIds.add(parentId);
              }
            } else {
              unmatchedBodyPartNames.add(bpName);
            }
          }
          for (const bpId of associatedIds) {
            bodyPartAssocs.push({
              condition_id: inserted.id,
              body_part_id: bpId,
            });
          }
        }
      }

      if (categoryAssocs.length > 0) {
        const { error: catErr } = await client
          .from("condition_categories")
          .upsert(categoryAssocs, { onConflict: "category_id,condition_id" });
        if (catErr)
          console.error("❌ Error inserting category associations:", catErr);
      }

      if (bodyPartAssocs.length > 0) {
        const { error: bpErr } = await client
          .from("condition_body_parts")
          .upsert(bodyPartAssocs, { onConflict: "body_part_id,condition_id" });
        if (bpErr)
          console.error("❌ Error inserting body part associations:", bpErr);
      }

      console.log(`✅ Processed batch ${i + 1} of ${diseaseBatches.length}`);
    }

    console.log("🎉 Seeding completed successfully!");

    if (diseasesWithoutMapping.size > 0) {
      console.warn(
        `⚠️  ${diseasesWithoutMapping.size} disease(s) had no entry in diseaseMapping (is_systemic defaulted to false, no body parts assigned):`,
      );
      console.warn("   " + [...diseasesWithoutMapping].join(", "));
    }
    if (unmatchedCategorySlugs.size > 0) {
      console.warn(
        `⚠️  ${unmatchedCategorySlugs.size} category_association_slug value(s) did not match any row in categories:`,
      );
      console.warn("   " + [...unmatchedCategorySlugs].join(", "));
    }
    if (unmatchedBodyPartNames.size > 0) {
      console.warn(
        `⚠️  ${unmatchedBodyPartNames.size} body part name(s) in diseaseMapping did not match any row in body_parts:`,
      );
      console.warn("   " + [...unmatchedBodyPartNames].join(", "));
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
