# Hospital Management System — Frontend Testing Guide

A step-by-step manual testing guide for all modules and roles. Follow sections in order — later sections depend on data created in earlier ones.

---

## System Architecture Overview

```
Browser
  └─ Next.js (App Router)
       ├─ Zustand (auth state — persisted in sessionStorage)
       ├─ TanStack Query (server state, caching, background refetch)
       └─ Axios (HTTP client with JWT interceptor)
            └─ Backend API (Express + Prisma + PostgreSQL on Supabase)
```

**Authentication flow:**
- Login → backend returns `accessToken` (short-lived JWT) + sets `refreshToken` as httpOnly cookie.
- `accessToken` is stored in a module-level variable and in `sessionStorage` (survives page refresh, cleared on tab close).
- Every request sends `Authorization: Bearer <token>` header.
- When a 401 is returned, the Axios interceptor automatically calls `POST /auth/refresh` using the cookie, gets a new access token, and retries the original request — transparent to the user.
- `/auth/` endpoints are excluded from retry to avoid infinite loops.

**Role hierarchy:**
```
Super Admin  →  full access (all hospitals)
Hospital Admin → full access within their hospital
Receptionist   → patients, sessions (view), appointments, collect payments
Doctor         → own appointments, own patients, medical records, own profile
Accountant     → payments, reports, view appointments and patients
```

---

## Prerequisites

| Item | Value |
|------|-------|
| App URL | `http://localhost:3000` |
| Super Admin email | `admin@hospital.com` |
| Super Admin password | `Admin@123` |
| Backend API | `https://hospital-managemnt-system.vercel.app/api/v1` |

> **Fresh database assumed.** If data exists from prior testing, run the SQL reset in the Supabase dashboard to wipe all transactional data while keeping the Super Admin, roles, hospital, and branch.

---

## Section 1 — Authentication

### How it works
The login page (`/login`) calls `POST /auth/login`. On success the access token is stored and the user is redirected to `/dashboard`. The `(auth)/layout.tsx` redirects already-authenticated users away from `/login`. The `(dashboard)/layout.tsx` redirects unauthenticated users back to `/login`.

### 1.1 Login page redirect guard

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Open `http://localhost:3000` while not logged in | Redirected to `/login` |
| 2 | Open `http://localhost:3000/dashboard` directly | Redirected to `/login` |
| 3 | Log in with `admin@hospital.com` / `Admin@123` | Redirected to `/dashboard` |
| 4 | While logged in, navigate to `/login` directly | Redirected back to `/dashboard` |

### 1.2 Invalid credentials

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Enter wrong password → click Login | Red error toast: "Invalid credentials" |
| 2 | Leave email empty → click Login | Form validation error under email field |
| 3 | Enter invalid email format → click Login | Form validation error under email field |

### 1.3 Session persistence

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Super Admin | Dashboard loads |
| 2 | Refresh the page (F5) | Stays on dashboard — token restored from sessionStorage |
| 3 | Open a new tab and navigate to the app | Redirected to `/login` — sessionStorage is per-tab |

### 1.4 Logout

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click profile avatar → Logout | Redirected to `/login`, auth state cleared |
| 2 | Press browser Back | Cannot navigate back to protected pages |

---

## Section 2 — Super Admin: Initial Setup

### How it works
Super Admin is the only role that can see the **Hospitals** tab and manage the **Users** tab without a hospital restriction. They see a hospital-level dashboard with aggregated stats. The `hospital_id` on the JWT scopes all backend queries — Super Admin has access to all hospitals.

### Visible tabs for Super Admin
Dashboard, Patients, Doctors, Sessions, Appointments, Payments, Medical Records, Reports, Users, Roles, Hospitals

### 2.1 Dashboard

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Super Admin | Dashboard shows: total patients, appointments today, revenue cards, top doctors, recent appointments |

### 2.2 View Hospitals tab

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click **Hospitals** in sidebar | List of hospitals with name, address, phone |
| 2 | Confirm at least one hospital exists (seeded) | Hospital row visible |

### 2.3 Create a Hospital Admin user

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Go to **Users** → click **Create User** | Modal opens |
| 2 | Fill: Name = `Test Admin`, Email = `admin2@hospital.com`, Password = `Admin@123` | — |
| 3 | Select Role = `Hospital Admin` | Role dropdown shows Hospital Admin |
| 4 | Click **Create User** | Success toast, user appears in table |
| 5 | Confirm status badge shows **Active** | Green "Active" badge |

### 2.4 View Roles tab

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click **Roles** in sidebar | Role list shows: Super Admin, Hospital Admin, Receptionist, Doctor, Accountant with their permissions |

---

## Section 3 — Hospital Admin: Staff Creation

### How it works
Hospital Admin can create users with roles: Receptionist, Doctor, Accountant. When a **Doctor** role user is created from the Users tab, the backend automatically creates a linked Doctor record with default specialization "General Practitioner" and an initial fee of Rs 0. The `doctor_id` is embedded in the Doctor user's JWT on next login.

### Visible tabs for Hospital Admin
Dashboard, Patients, Doctors, Sessions, Appointments, Payments, Medical Records, Reports, Users

### 3.1 Log in as Hospital Admin

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log out Super Admin | Redirected to login |
| 2 | Log in with `admin2@hospital.com` / `Admin@123` | Dashboard loads with hospital-scoped data |
| 3 | Confirm **Roles** and **Hospitals** tabs are NOT visible | Sidebar only shows allowed tabs |

### 3.2 Create a Receptionist

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Go to **Users** → **Create User** | Modal opens |
| 2 | Fill: Name = `Saman Reception`, Email = `reception@hospital.com`, Password = `Test@123`, Role = `Receptionist` | — |
| 3 | Click **Create User** | Success toast |

### 3.3 Create a Doctor via Users tab

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Create User: Name = `Dr. Nimal Perera`, Email = `nimal@hospital.com`, Password = `Test@123`, Role = `Doctor` | Success toast |
| 2 | Go to **Doctors** tab | Dr. Nimal Perera appears with specialization "General Practitioner" and fee "Not set" or Rs 0.00 |

> **Note:** The doctor is created with a default fee of Rs 0. The "Set Fee" button must be used to assign the real fee.

### 3.4 Create an Accountant

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Create User: Name = `Kamal Account`, Email = `kamal@hospital.com`, Password = `Test@123`, Role = `Accountant` | Success toast |

### 3.5 Edit a user

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click pencil icon on Saman Reception | Edit modal opens pre-filled with Name and Email |
| 2 | Change name to `Saman Receptionist` → Save | Success toast, table updates |

### 3.6 Reset a user's password

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click key icon on any user | Reset Password modal opens |
| 2 | Enter new password + confirm → submit | Success toast |
| 3 | Enter mismatched passwords | Validation error "Passwords do not match" |

### 3.7 Password show/hide toggle

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Open Create User modal | Password field shows `••••••` |
| 2 | Click eye icon | Password becomes visible as plain text |
| 3 | Click again | Returns to hidden |

### 3.8 Deactivate a user

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click deactivate (UserX) icon on a user | Confirm dialog appears |
| 2 | Click **Deactivate** | User status changes to **Inactive** |
| 3 | Confirm deactivated user cannot log in | Redirected back to login with error |
| 4 | Reactivate is not in UI — must be done via backend/DB directly | — |

---

## Section 4 — Doctor Management

### How it works
Doctors are managed from the **Doctors** tab. A Doctor can be created two ways:
1. **Doctors tab** (full form) — sets name, specialization, fee, qualifications, contact, creates login optionally.
2. **Users tab** (name/email/password only) — backend auto-creates Doctor profile with defaults; fee must be set separately.

Fee records are **insert-only** (never updated). Each call to "Set Fee" adds a new row with `effective_from = current timestamp`. The backend picks the most recent fee where `effective_from ≤ now` as the "current fee".

### 4.1 Set fee for doctor created via Users tab

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Go to **Doctors** → find Dr. Nimal Perera | Shows Rs 0.00 or "Not set" |
| 2 | Click **$** (Set Fee) icon | Modal opens with current fee pre-filled |
| 3 | Change fee to `2000` → leave Effective From as today | — |
| 4 | Click **Set Fee** | Success toast, table instantly refreshes to Rs 2,000.00 |

### 4.2 Add a doctor from the Doctors tab (with full details)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click **Add Doctor** button | Full form modal opens |
| 2 | Fill: Name = `Dr. Palitha Dias`, Specialization = `Cardiology`, Contact = `0771145689`, Fee = `3000` | — |
| 3 | Check **Create login account**, enter Email = `palitha@hospital.com`, Password = `Test@123` | Login section appears |
| 4 | Click **Create Doctor** | Success toast, doctor appears in list with Rs 3,000.00 |

### 4.3 Edit doctor profile (Admin)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click pencil icon on a doctor | Edit modal opens **pre-filled** with existing data |
| 2 | Change specialization → Save | Table updates immediately |
| 3 | Confirm Fee fields are NOT shown in edit modal | Fee is managed separately via Set Fee |

### 4.4 Doctor detail page

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Navigate to `/doctors/<doctor_id>` directly | Detail page shows name, specialization, contact, fee, experience, bio |
| 2 | As Hospital Admin, confirm **Edit Profile** button is visible | Button shown top-right |
| 3 | Click Edit Profile | Modal opens with Name, Specialization, Qualifications, Experience, Bio (no email/phone/password) |
| 4 | Update Bio → Save | Page refreshes with new bio |

---

## Section 5 — Patient Management

### How it works
Patients are registered system-wide (not per-doctor). The backend's `GET /patients` endpoint returns paginated results filtered by the logged-in user's `hospital_id`. Doctors see only **their patients** (patients who have booked appointments with them — derived from the appointments list filtered by `doctor_id` in the JWT).

### 5.1 Register a patient (as Receptionist)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log out → Log in as `reception@hospital.com` | Receptionist dashboard |
| 2 | Go to **Patients** → click **Add Patient** | Form modal opens |
| 3 | Fill: Name = `Kamal Silva`, NIC = `990123456V`, Phone = `0771234567`, Gender = `Male`, Age = `35` | — |
| 4 | Click **Create Patient** | Success toast, patient appears in list |
| 5 | Register 2 more patients with different NICs | — |

### 5.2 Search patients

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Type `Kamal` in search bar | List filters in real time (400ms debounce) |
| 2 | Type a partial NIC | Matches patient by NIC |
| 3 | Type phone digits | Matches patient by phone |
| 4 | Clear search | Full list returns |

### 5.3 Edit patient

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click pencil icon on a patient | Edit modal opens pre-filled |
| 2 | NIC field is **disabled** | NIC cannot be changed |
| 3 | Update address → Save | Success toast |

### 5.4 Accountant sees patients (read-only)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as `kamal@hospital.com` (Accountant) | Dashboard loads |
| 2 | Go to **Patients** | Patient list visible, no Add/Edit button |

---

## Section 6 — Session Management

### How it works
A Session (`ChannelSession`) links a Doctor to a Branch on a specific date with a time range, slot duration, and max patient count. The backend creates `SessionSlot` records for each time slot automatically. Status flow: `scheduled → open → full (auto) / closed / cancelled`. Only **open** sessions accept appointment bookings. Receptionist and Doctor can view sessions but only Admins can create/close them. The Queue page shows live appointment order for a session.

### 6.1 Create a session (as Hospital Admin)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Hospital Admin → go to **Sessions** | Sessions list |
| 2 | Click **Create Session** | Modal opens |
| 3 | Select **Branch** from dropdown | Branches loaded from `GET /branches` |
| 4 | Select **Doctor** = Dr. Palitha Dias | — |
| 5 | Date = today, Start = `09:00`, End = `12:00`, Slot Duration = `15` min, Max Patients = `10` | — |
| 6 | Click **Create** | Success toast, session appears with status `scheduled` |

### 6.2 Open the session

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Find the created session | Status = `scheduled` |
| 2 | Click **Open** button | Status changes to `open` |
| 3 | Confirm **Queue** button now appears | Only open sessions show Queue |

### 6.3 View session queue

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Click **Queue** on an open session | Queue page `/sessions/<id>/queue` loads |
| 2 | Queue is empty initially | "No appointments" state |
| 3 | After booking appointments (Section 7), return here | Appointments listed in slot order |

### 6.4 Receptionist views sessions

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Receptionist → go to **Sessions** | Sessions list visible |
| 2 | Confirm no **Create Session** button | Receptionist can only view |
| 3 | Click **Queue** on an open session | Queue page accessible |

### 6.5 Doctor views sessions

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as `palitha@hospital.com` (Doctor) | Sessions tab visible |
| 2 | Go to **Sessions** | Shows only sessions for this doctor |
| 3 | Click **Queue** on their open session | Queue visible |

---

## Section 7 — Appointment Booking & Lifecycle

### How it works
Appointments are booked against an **open** session's slot. Status transitions are strictly enforced:

```
booked → confirmed → arrived → completed
                  ↘ cancelled        ↘ no_show
```

Each transition is a `PATCH /appointments/:id/status` call. The frontend enforces allowed transitions — buttons only appear for valid next statuses. Booking creates a linked `Payment` record with status `pending`. The payment is fulfilled separately.

### 7.1 Book an appointment (as Receptionist)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Receptionist → go to **Appointments** | Appointment list |
| 2 | Click **Book Appointment** | Modal opens |
| 3 | Pick today's date | Open sessions for today appear in dropdown |
| 4 | Select the session for Dr. Palitha Dias | Session slots visible |
| 5 | Select patient = `Kamal Silva` | Patient searchable in dropdown |
| 6 | Click **Book** | Success toast, appointment appears with status `booked` |
| 7 | Book 2 more appointments for same session (different patients) | — |

### 7.2 Appointment status flow (Admin/Hospital Admin)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Hospital Admin → go to **Appointments** | List shows booked appointments |
| 2 | Find appointment status = `booked` | Status dropdown shows `confirmed`, `cancelled` |
| 3 | Change to `confirmed` | Badge updates to **confirmed** |
| 4 | Change to `arrived` | Badge updates to **arrived** |
| 5 | Change to `completed` | Badge updates to **completed** — no further transitions |
| 6 | Confirm `completed` appointment shows no status dropdown | Terminal state |

### 7.3 Cancel an appointment

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Find a `booked` or `confirmed` appointment | — |
| 2 | Change status to `cancelled` | Badge updates, no further transitions |

### 7.4 No-show

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Find an `arrived` appointment | Status options: `completed`, `no_show` |
| 2 | Change to `no_show` | Badge updates |

### 7.5 Filter appointments

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Use date filter (today) | Shows only today's appointments |
| 2 | Use status filter (booked) | Filters to that status |
| 3 | Combine date + status filter | Intersection of both filters |

### 7.6 Doctor views their appointments

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Dr. Palitha Dias (`palitha@hospital.com`) | — |
| 2 | Go to **Appointments** | Shows only appointments for this doctor |
| 3 | Find an `arrived` appointment | Status options: `completed`, `no_show` |
| 4 | Change to `completed` | Success toast — doctor can complete appointments |
| 5 | Confirm doctor CANNOT book new appointments | Book button not visible |

### 7.7 Doctor's patient list

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | As Doctor, go to **Patients** | Shows "My Patients" view (not full hospital list) |
| 2 | Only patients who booked with this doctor appear | Derived from appointments |
| 3 | Last visit date shown | From most recent appointment |

---

## Section 8 — Payment Processing

### How it works
Each appointment automatically creates a `Payment` record with status `pending` when booked. The total fee = doctor consultation fee + hospital charge (if set). Payments are recorded as `PaymentTransaction` entries. A payment can be partial (multiple transactions) or full. The `canPay` permission uses `CAN_PROCESS_PAYMENTS` — available to Super Admin, Hospital Admin, Accountant, and Receptionist.

### 8.1 Pay for an appointment (Receptionist)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Receptionist → go to **Appointments** | Appointment list |
| 2 | Find a `booked` or `confirmed` appointment with payment badge `pending` | Pay button visible |
| 3 | Click **Pay** button | Payment modal opens |
| 4 | Confirm total fee shown (e.g., Rs 2,000.00 or Rs 3,000.00) | Fee from doctor's current fee record |
| 5 | Enter amount = full fee, method = `cash` → Submit | Success toast, badge changes to `paid` |

### 8.2 Partial payment

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Open Pay modal for a pending appointment | Balance shown |
| 2 | Pay half the amount (e.g., Rs 1,500 of Rs 3,000) | Badge changes to `partial` |
| 3 | Open Pay modal again | Remaining balance = Rs 1,500 shown |
| 4 | Pay remaining balance | Badge changes to `paid` |

### 8.3 View full payment list (Accountant)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Accountant → go to **Payments** | Full payment history across hospital |
| 2 | Payments show patient name, doctor, amount, method, date | — |
| 3 | Confirm Accountant also sees **Appointments** tab | Both tabs visible |
| 4 | Confirm Pay button is visible in Appointments for Accountant | `CAN_PROCESS_PAYMENTS` includes Accountant |

### 8.4 Receptionist cannot access Payments page

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Receptionist → try navigating to `/payments` directly | "Access Restricted" empty state |
| 2 | Confirm **Payments** tab not in sidebar | Correct — Receptionist uses Pay button in Appointments only |

---

## Section 9 — Medical Records

### How it works
Medical records are created by Doctors after completing an appointment. Each record links to a patient and optionally a doctor. A record contains diagnosis, prescription notes, and can have child `Prescription` entries. Only Super Admin, Hospital Admin, and Doctors can view medical records. Only Doctors can write them.

### 9.1 Doctor creates a medical record

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Doctor → go to **Medical Records** | Medical records list |
| 2 | Click **New Record** (if available) | Form opens |
| 3 | Select patient, enter diagnosis and notes | — |
| 4 | Submit | Record appears in list |

### 9.2 Admin views medical records

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Hospital Admin → go to **Medical Records** | All records for hospital visible |
| 2 | Confirm Admin cannot create records | No "New Record" button or button is disabled |

### 9.3 Access restriction

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Receptionist → navigate to `/medical-records` | "Access Restricted" shown |
| 2 | Log in as Accountant → navigate to `/medical-records` | "Access Restricted" shown |

---

## Section 10 — Reports

### How it works
The Reports page fetches aggregated statistics from the backend: revenue totals, appointment counts by status, top-performing doctors, and daily/monthly breakdowns. Only Super Admin, Hospital Admin, and Accountant can access this module.

### 10.1 View reports (Hospital Admin)

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Hospital Admin → go to **Reports** | Revenue and appointment summary charts/tables load |
| 2 | Data reflects appointments and payments created in prior sections | — |

### 10.2 Accountant views reports

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Accountant → go to **Reports** | Reports visible |
| 2 | Confirm Accountant has: Dashboard, Patients, Appointments, Payments, Reports | All 5 tabs visible |

### 10.3 Access restriction

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Receptionist → navigate to `/reports` | "Access Restricted" shown |
| 2 | Log in as Doctor → navigate to `/reports` | "Access Restricted" shown |

---

## Section 11 — Profile Page

### How it works
The Profile page calls `GET /auth/me` which returns the authenticated user's full record including their linked Doctor profile (if any). The query is guarded by `enabled: isAuthenticated` to prevent a 401 before the access token is restored from sessionStorage.

### 11.1 View own profile

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as any user → click avatar or go to `/profile` | Profile page loads |
| 2 | Shows: name, email, role badge, status, member since, hospital | Correct data for logged-in user |
| 3 | Refresh page | Profile still loads (token restored from sessionStorage) |

### 11.2 Doctor profile card and self-edit

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Log in as Dr. Palitha Dias → go to `/profile` | Doctor Profile card shown at bottom |
| 2 | Card shows: name, specialization, status | Correct doctor details |
| 3 | Click **Edit Profile** button on the card | Navigates to `/doctors/<doctor_id>` |
| 4 | Doctor detail page shows **Edit Profile** button (because `user.doctor_id === page id`) | Button visible |
| 5 | Click Edit Profile → update Qualifications = `MBBS, MD` | Form pre-filled with current values |
| 6 | Click Save | Profile page and doctor list both reflect the update |
| 7 | Confirm doctor CANNOT edit: Contact, Email (those are in admin's Doctors form) | Fields not present in self-edit modal |

---

## Section 12 — Role-Based Access Verification Checklist

Run this after all previous sections to verify each role only sees what it should.

### Sidebar tab visibility

| Tab | Super Admin | Hospital Admin | Receptionist | Doctor | Accountant |
|-----|:-----------:|:--------------:|:------------:|:------:|:----------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Patients | ✓ | ✓ | ✓ | ✓ (own only) | ✓ (read) |
| Doctors | ✓ | ✓ | ✓ (read) | — | — |
| Sessions | ✓ | ✓ | ✓ (read+queue) | ✓ (own) | — |
| Appointments | ✓ | ✓ | ✓ | ✓ (own) | ✓ |
| Payments | ✓ | ✓ | — | — | ✓ |
| Medical Records | ✓ | ✓ | — | ✓ | — |
| Reports | ✓ | ✓ | — | — | ✓ |
| Users | ✓ | ✓ | — | — | — |
| Roles | ✓ | — | — | — | — |
| Hospitals | ✓ | — | — | — | — |

### Action-level permissions

| Action | Super Admin | Hospital Admin | Receptionist | Doctor | Accountant |
|--------|:-----------:|:--------------:|:------------:|:------:|:----------:|
| Create Doctor | ✓ | ✓ | — | — | — |
| Set Doctor Fee | ✓ | ✓ | — | — | — |
| Create Session | ✓ | ✓ | — | — | — |
| Book Appointment | ✓ | ✓ | ✓ | — | — |
| Complete Appointment | ✓ | ✓ | — | ✓ | — |
| Collect Payment (Pay button) | ✓ | ✓ | ✓ | — | ✓ |
| View All Payments | ✓ | ✓ | — | — | ✓ |
| Write Medical Record | ✓ | ✓ | — | ✓ | — |
| Create Users | ✓ | ✓ | — | — | — |
| Create Roles | ✓ | — | — | — | — |

---

## Section 13 — Edge Cases & Error Scenarios

### 13.1 Booking on a full/closed session

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Create a session with Max Patients = 1 | — |
| 2 | Book 1 appointment | Session status becomes `full` automatically |
| 3 | Try to book another | Session no longer appears in the "open sessions" dropdown |

### 13.2 Cannot deactivate doctor with future sessions

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Try to set a doctor status to `inactive` while they have future sessions scheduled | Error toast from backend: "Cannot deactivate doctor. X future session(s) exist" |

### 13.3 Duplicate NIC on patient registration

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Try to register a patient with an NIC that already exists | Error toast with backend message |

### 13.4 Duplicate email on user creation

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Create a user with an email that already exists | Error toast: "A user with this login email already exists" |

### 13.5 Form validation

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Submit Create User form with empty name | "Name is required" under the field |
| 2 | Submit with short password (< 6 chars) | "Password must be at least 6 characters" |
| 3 | Submit Create Session with no branch selected | Branch validation error |
| 4 | Submit Set Fee with fee = -1 | "Fee must be 0 or greater" |

### 13.6 Network/token expiry

| Step | Action | Expected result |
|------|--------|----------------|
| 1 | Wait for access token to expire (typically 15 min) then make any API call | Interceptor auto-refreshes token transparently, request retries — no error shown to user |
| 2 | Clear the refresh token cookie manually (DevTools → Application → Cookies → delete) then make a request | Redirected to login |

---

## Quick Test Sequence (Smoke Test)

If you only have 15 minutes, run this minimal path to verify the core system works:

1. Login as `admin@hospital.com`
2. Create a Hospital Admin user
3. Login as that admin → create a Receptionist, a Doctor (Users tab), an Accountant
4. Go to Doctors → Set Fee for the auto-created doctor
5. Login as Receptionist → register 2 patients
6. Login as Hospital Admin → create a Session for today → Open it
7. Login as Receptionist → book 2 appointments in that session
8. Change one appointment status to `confirmed → arrived`
9. Click Pay → full payment → confirm badge = `paid`
10. Login as Doctor → go to Appointments → complete the arrived one
11. Login as Accountant → verify Payments page shows the transaction
12. Login as Doctor → go to Profile → Edit Profile → update bio

If all 12 steps pass without errors, the core system is working correctly.
