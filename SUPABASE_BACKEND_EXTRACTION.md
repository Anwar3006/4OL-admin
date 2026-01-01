# Supabase Backend Extraction - 4 Our Life Project

This document catalogs all Supabase database tables, SDK functions, and their usage locations in the project. Use this as a reference to recreate the backend with Node.js/Express.

---

## 📊 Database Tables

### 1. **user_profiles**
**Description**: Stores user account information and profiles
**Fields Used**:
- id, first_name, last_name, email, phone_number, password (encrypted)
- sex, role, permissions, dob, avatar_url
- last_activity, created_at, updated_at, created_by, updated_by
- is_created_by_admin_panel, is_tracker_notifications_enabled
- fcm_token, region

**Operations**: SELECT, INSERT, UPDATE
**Files**:
- `/app/services/login.js` - Login, phone lookup, profile fetching
- `/app/services/signup.js` - User registration
- `/app/services/dashboard.js` - User stats (total users, online users, gender breakdown)
- `/app/services/period_tracker_service.js` - User info for tracker logs
- `/app/api/cron/tracker/route.js` - FCM token for notifications
- `/utils/activityLogger.js` - User name lookups
- `/hooks/usePermissions.js` - Permission and role fetching

---

### 2. **healthcare_profiles**
**Description**: Healthcare facility profiles and information
**Fields Used**:
- id, facility_type, facility_name, contact_num, whatsapp, email
- gps_address, street, post_code, area, district, region, country
- hospital_services, hospital_amenities, pharmacy_services
- first_name, last_name, person_contact_number, position
- status (Approved/Pending), business_hours, mediaUrls, keywords
- device_name, device_model, device_vendor, operating_system
- latitude, longitude, avg_rating, created_at, approved_at

**Operations**: SELECT, INSERT, UPDATE
**Files**:
- `/app/services/healthcare-profile.js` - Facility creation
- `/app/services/dashboard.js` - Total facilities count, approval status
- `/app/services/map_service.js` - Map markers, regions, districts, facility types
- `/services/approveFacility.js` - Status updates to Approved

---

### 3. **daily_active_users**
**Description**: Tracks daily active users for analytics
**Fields Used**:
- date, gender, user_id

**Operations**: SELECT with date range filtering
**Files**:
- `/app/services/dashboard.js` - DAU last 30 days with gender breakdown

---

### 4. **monthly_active_users**
**Description**: Tracks monthly active users for analytics
**Fields Used**:
- month, gender, user_id

**Operations**: SELECT with month range filtering
**Files**:
- `/app/services/dashboard.js` - MAU last 12 months with gender breakdown

---

### 5. **downloads**
**Description**: App download/install tracking
**Fields Used**:
- id, install_date, operating_system (Android/iOS), user_id

**Operations**: SELECT, COUNT
**Files**:
- `/app/services/dashboard.js` - Total downloads, downloads by OS, downloads by period

---

### 6. **medication_reminders**
**Description**: User medication reminder schedules
**Fields Used**:
- id, user_id, medication_name, medication_type, condition
- start_date, end_date, medication_amount, medication_dose
- intake_amount, intake_times

**Operations**: SELECT with joins to user_profiles
**Files**:
- `/app/services/dashboard.js` - Total medication reminder users, gender stats
- `/app/(dashboard)/medication-reminder/page.jsx` - Listing and search

---

### 7. **medications**
**Description**: Detailed medication information and schedules
**Fields Used**:
- id, user_id, intake_times (with schedule_dates, utc_schedule_times)

**Operations**: SELECT with joins to user_profiles
**Files**:
- `/app/api/notifications/route.js` - Fetching for scheduled notifications

---

### 8. **tracker_logs**
**Description**: Period tracker logs and data
**Fields Used**:
- id, user_id, period_start_date, period_start_date_utc
- period_length, cycle_length, flow_types
- next_reminder, next_reminder_utc
- ovulation_date, ovulation_date_utc
- fertile_window_dates, fertile_window_dates_utc
- created_at, updated_at

**Operations**: SELECT, INSERT, UPDATE, DELETE
**Files**:
- `/app/services/period_tracker_service.js` - CRUD operations
- `/app/services/dashboard.js` - Total period tracker users
- `/app/api/cron/tracker/route.js` - Automated reminder updates

---

### 9. **illness_and_conditions**
**Description**: Diseases and medical conditions database
**Fields Used**:
- id, specialist_to_contact, created_at

**Operations**: SELECT, INSERT, UPDATE, DELETE
**Files**:
- `/app/services/diseases-service.js` - Full CRUD operations
- `/app/services/dashboard.js` - Total diseases count, specialist stats

---

### 10. **symptoms**
**Description**: Medical symptoms database
**Fields Used**:
- id, created_at (and other symptom-specific fields)

**Operations**: SELECT, INSERT, UPDATE, DELETE
**Files**:
- `/app/services/symptoms-service.js` - Full CRUD operations
- `/app/services/dashboard.js` - Total symptoms count

---

### 11. **healthy_living**
**Description**: Health and wellness articles/tips
**Fields Used**:
- id, created_at (and other content fields)

**Operations**: SELECT, INSERT, UPDATE, DELETE
**Files**:
- `/app/services/healthy-living-service.js` - Full CRUD operations
- `/app/services/dashboard.js` - Total healthy living articles count

---

### 12. **banners_ads**
**Description**: Marketing banners and advertisements
**Fields Used**:
- id, created_at, updated_at, created_by, updated_by
- is_created_by_admin_panel, headlines, description
- callToAction, mediaType, mediaUrls
- starting_date_and_time, end_date_and_time
- bannerType (ads/news/health/events), isPublished, duration

**Operations**: SELECT, INSERT, UPDATE, DELETE
**Files**:
- `/app/services/banners_ads.js` - Full CRUD operations, status changes
- `/app/services/dashboard.js` - Marketing breakdown by banner types

---

### 13. **activity_logs**
**Description**: Audit trail of user activities
**Fields Used**:
- id, user_id, user_name, type, action, description
- reference, reference_id, ip_address, user_agent
- device_info, is_created_by_admin_panel, metadata, timestamp

**Operations**: SELECT, INSERT
**Files**:
- `/utils/activityLogger.js` - Complete activity logging system
- Functions: logActivity, logAuthActivity, logUserActivity, logDataModification, logAdminAction

---

### 14. **notifications**
**Description**: In-app notifications
**Fields Used**:
- id, created_at, updated_at, is_seen
- title, body, type, screen, user_id

**Operations**: INSERT
**Files**:
- `/app/api/cron/tracker/route.js` - Period tracker notifications

---

### 15. **FAQs**
**Description**: Frequently Asked Questions
**Fields Used**:
- id, question, answer, created_at, updated_by, created_by

**Operations**: SELECT with joins to user_profiles
**Files**:
- `/services/getFaqs.js` - Fetching FAQs with creator info

---

### 16. **facility_ratings**
**Description**: User ratings and reviews for healthcare facilities
**Fields Used**:
- id, comment, rating, user_id, facility_id

**Operations**: SELECT with joins to user_profiles and healthcare_profiles
**Files**:
- `/app/services/fetchFacilityRatings.js` - Fetching ratings with user and facility info
- `/app/(dashboard)/reviews/page.jsx` - Display and management

---

## 🔐 Supabase Auth Operations

### Authentication Functions Used:

1. **auth.signInWithPassword()**
   - **File**: `/app/services/login.js`
   - **Purpose**: User login with email/password

2. **auth.signUp()**
   - **File**: `/app/services/signup.js`
   - **Purpose**: New user registration

3. **auth.signOut()**
   - **File**: `/app/services/login.js`
   - **Purpose**: User logout

4. **auth.signInWithOtp()**
   - **File**: `/app/services/login.js`
   - **Purpose**: Send OTP to email for password reset

5. **auth.verifyOtp()**
   - **File**: `/app/services/login.js`
   - **Purpose**: Verify OTP sent to email

6. **auth.updateUser()**
   - **File**: `/app/services/login.js`
   - **Purpose**: Update user password

7. **auth.getSession()**
   - **File**: `/app/services/login.js`
   - **Purpose**: Get current user session

---

## 📦 Supabase Storage Operations

### Storage Functions Used:

1. **storage.from(bucket).list(folder)**
   - **File**: `/app/utils/uploadMedia.js`
   - **Purpose**: List existing files in a bucket/folder

2. **storage.from(bucket).upload(path, file)**
   - **File**: `/app/utils/uploadMedia.js`
   - **Purpose**: Upload media files to storage

3. **storage.from(bucket).getPublicUrl(path)**
   - **File**: `/app/utils/uploadMedia.js`
   - **Purpose**: Get public URL for uploaded files

**Functions**:
- `uploadMediaFiles(bucketName, folderName, tableName, mediaFiles)`
- `uploadSingleFileToSupabase(file, bucket, folder)`

---

## 🔧 Common Supabase Query Methods

### Database Query Methods Used Throughout:

1. **from(table).select(columns)**
   - Purpose: Fetch data from tables
   - Options: `{ count: "exact" }`, `{ count: "exact", head: true }`

2. **from(table).insert(data)**
   - Purpose: Insert new records

3. **from(table).update(data)**
   - Purpose: Update existing records

4. **from(table).delete()**
   - Purpose: Delete records

### Query Filters:

- **eq(column, value)** - Equals
- **gte(column, value)** - Greater than or equal
- **lte(column, value)** - Less than or equal
- **gt(column, value)** - Greater than
- **not(column, operator, value)** - Not equal
- **is(column, value)** - Is null/true/false
- **ilike(column, pattern)** - Case-insensitive like

### Query Modifiers:

- **order(column, { ascending: bool })**
- **range(from, to)** - Pagination
- **limit(count)** - Limit results
- **single()** - Expect single result

---

## 🔥 Firebase Integration

### Firebase Cloud Messaging (FCM):

**File**: `/app/api/notifications/route.js`, `/app/api/cron/tracker/route.js`

**Service Account**: `/app/api/notifications/serviceAccountKey.json`

**Usage**:
- Sending medication reminders
- Sending period tracker notifications

**Functions**:
```javascript
await firebase.messaging().send({
  token: fcm_token,
  notification: { title, body },
  data: { screen, id }
})
```

---

## 📂 Key Service Files Structure

### Authentication Services:
- `/app/services/login.js` - Login, logout, OTP, password reset
- `/app/services/signup.js` - User registration

### Data Services:
- `/app/services/dashboard.js` - All dashboard statistics and analytics
- `/app/services/healthcare-profile.js` - Healthcare facility management
- `/app/services/period_tracker_service.js` - Period tracker CRUD
- `/app/services/symptoms-service.js` - Symptoms CRUD
- `/app/services/healthy-living-service.js` - Healthy living CRUD
- `/app/services/diseases-service.js` - Diseases CRUD
- `/app/services/banners_ads.js` - Marketing/ads CRUD
- `/app/services/map_service.js` - Map data and filters
- `/app/services/fetchFacilityRatings.js` - Reviews and ratings
- `/services/getFaqs.js` - FAQ management
- `/services/approveFacility.js` - Facility approval

### Utility Services:
- `/app/utils/uploadMedia.js` - Media upload to storage
- `/utils/activityLogger.js` - Activity logging system
- `/hooks/usePermissions.js` - Permission management

### API Routes:
- `/app/api/notifications/route.js` - Medication notifications
- `/app/api/cron/tracker/route.js` - Period tracker reminders
- `/app/api/support/route.js` - Support form emails
- `/app/api/update-phone/route.js` - Update user phone

---

## 🎯 Recommended Express/Node.js Structure

### Suggested Routes:

```
/api/auth
  POST /login
  POST /signup
  POST /logout
  POST /send-otp
  POST /verify-otp
  POST /reset-password
  GET  /session

/api/users
  GET    /users
  GET    /users/:id
  POST   /users
  PUT    /users/:id
  DELETE /users/:id
  GET    /users/:id/permissions

/api/facilities
  GET    /facilities
  GET    /facilities/:id
  POST   /facilities
  PUT    /facilities/:id
  DELETE /facilities/:id
  PUT    /facilities/:id/approve
  GET    /facilities/pending
  GET    /facilities/map-markers

/api/tracker
  GET    /tracker/logs
  GET    /tracker/logs/:id
  POST   /tracker/logs
  PUT    /tracker/logs/:id
  DELETE /tracker/logs/:id

/api/symptoms
  GET    /symptoms
  GET    /symptoms/:id
  POST   /symptoms
  PUT    /symptoms/:id
  DELETE /symptoms/:id

/api/diseases
  GET    /diseases
  GET    /diseases/:id
  POST   /diseases
  PUT    /diseases/:id
  DELETE /diseases/:id

/api/healthy-living
  GET    /healthy-living
  GET    /healthy-living/:id
  POST   /healthy-living
  PUT    /healthy-living/:id
  DELETE /healthy-living/:id

/api/banners
  GET    /banners
  GET    /banners/:id
  POST   /banners
  PUT    /banners/:id
  DELETE /banners/:id
  PUT    /banners/:id/status

/api/medication-reminders
  GET    /medication-reminders
  GET    /medication-reminders/:id

/api/reviews
  GET    /reviews
  GET    /reviews/:id

/api/dashboard
  GET    /dashboard/dau
  GET    /dashboard/mau
  GET    /dashboard/downloads
  GET    /dashboard/users
  GET    /dashboard/facilities
  GET    /dashboard/specialists
  GET    /dashboard/online-users

/api/notifications
  POST   /notifications/send
  POST   /notifications/cron/tracker

/api/storage
  POST   /storage/upload
  GET    /storage/files

/api/activity-logs
  GET    /activity-logs
  POST   /activity-logs

/api/faqs
  GET    /faqs
```

---

## 💡 Migration Notes

### Database Schema Considerations:

1. **User IDs**: Supabase uses UUID. Consider keeping the same or mapping to your system.

2. **Timestamps**: 
   - Some tables use `bigint` timestamps (Unix milliseconds)
   - Others use `timestamptz` (PostgreSQL timestamp with timezone)
   - Standardize in your new backend

3. **Enums/Status Fields**:
   - facility status: "Approved" | "Pending"
   - banner types: "ads" | "news" | "health" | "events"
   - roles: "Super Admin" | custom roles

4. **JSON Fields**:
   - permissions (array of objects)
   - mediaUrls (array)
   - business_hours (object)
   - flow_types (array of objects)
   - device_info (object)

5. **Relations**:
   - user_profiles ← (many tables via created_by, updated_by, user_id)
   - healthcare_profiles ← facility_ratings
   - user_profiles ← tracker_logs
   - user_profiles ← medication_reminders

### Security Considerations:

1. **Password Encryption**: Currently using custom encryption in `/app/utils/helpers.js`
2. **Row Level Security (RLS)**: Implement authorization middleware
3. **API Keys**: Move from Supabase keys to your own JWT/OAuth system
4. **File Upload**: Implement file upload security and size limits

### Performance Considerations:

1. **Pagination**: All listings use `range(from, to)` for pagination
2. **Indexing**: Ensure proper indexes on frequently queried fields
3. **Caching**: Consider Redis for dashboard stats and frequent queries
4. **Real-time**: Supabase real-time subscriptions may need Socket.io replacement

---

## 📞 External Service Dependencies

### Twilio (SMS):
- **File**: `/services/approveFacility.js`
- **Purpose**: Send SMS when facility is approved
- **Variables**: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, TWILIO_VERIFY_SERVICE_SID

### Resend (Email):
- **File**: `/app/api/support/route.js`
- **Purpose**: Send support form emails
- **Variables**: RESEND_API_KEY, SUPPORT_TEAM_EMAIL

### Firebase (Push Notifications):
- **Files**: Multiple notification routes
- **Purpose**: Send push notifications to mobile app users
- **Service Account**: Needs `serviceAccountKey.json`

---

## 🚀 Environment Variables Required

```env
# Database
DATABASE_URL=

# Supabase (for migration period)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_KEY=
SERVICE_KEY=

# External Services
TWILIO_AUTH_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_VERIFY_SERVICE_SID=
RESEND_API_KEY=
SUPPORT_TEAM_EMAIL=

# Firebase
FIREBASE_PROJECT_ID=
# Service account JSON content

# App
NODE_ENV=production
PORT=3000
JWT_SECRET=
```

---

## 📝 Testing Checklist

- [ ] User registration and login
- [ ] Password reset flow (OTP)
- [ ] File upload to storage
- [ ] Healthcare facility CRUD
- [ ] Period tracker CRUD
- [ ] Symptoms/Diseases/Healthy Living CRUD
- [ ] Marketing banners CRUD
- [ ] Dashboard statistics
- [ ] Medication reminders
- [ ] Push notifications
- [ ] Activity logging
- [ ] Permission system
- [ ] Map data and filters
- [ ] Reviews and ratings
- [ ] FAQ management
- [ ] Email notifications

---

**Generated**: December 2024
**Project**: 4 Our Life
**Purpose**: Backend migration from Supabase to Node.js/Express
