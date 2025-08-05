
# GenAI-Campus: Application Overview & Feature Documentation

**Scope of this Document:** This document provides a high-level architectural overview and detailed textual descriptions of key user flows and features within the GenAI-Campus application. It aims to help team members understand the interaction between frontend (Next.js/React) and backend (Django) components. While it describes the sequence of operations, it does not include auto-generated visual diagrams (like UML, flowcharts, or detailed function call graphs for every single function), which are typically produced using specialized tools as part of an extensive, ongoing documentation effort.

## I. General Application Architecture

*   **Frontend**: Built with **Next.js** (a React framework).
    *   Uses **React** for building user interfaces.
    *   **ShadCN UI** for pre-built, customizable UI components.
    *   **Tailwind CSS** for styling.
    *   Client-side routing and page structure are managed by Next.js's App Router (files within the `src/app` directory).
    *   State management for authentication and theme is handled via React Context (`src/context/AuthContext.tsx`, `src/context/ThemeContext.tsx`).
    *   API interactions with the backend are done using `fetch` via a helper module (`src/lib/api.ts`).
*   **Backend**: Built with **Django** (a Python web framework).
    *   Uses **Django REST Framework (DRF)** to create API endpoints (primarily in `views.py` files of each app).
    *   Handles user authentication (token-based), data storage (using models defined in `models.py` and a database like SQLite), and business logic.
    *   Organized into Django apps: `accounts`, `content`, `notifications`.
*   **AI Integration**: Uses **Genkit** for AI-powered features.
    *   Flows defined in `src/ai/flows/`.
    *   Genkit configuration in `src/ai/genkit.ts`.

---

## II. Key User Flows & Features - Detailed Breakdown

#### A. Landing Page & Unauthenticated User Experience

1.  **Entry Point / Welcome Page:**
    *   **Primary Frontend File:** `src/app/page.tsx` (renders the `UnifiedDashboardPage` component).
    *   **Functionality:**
        *   If user is unauthenticated: Displays a dynamic hero section with a video background (`FixedBackground` component using `public/videos/educational-bg.mp4`) and the application logo (`src/components/shared/Logo.tsx`).
        *   Showcases features for Students, Parents, and Schools/Teachers using `FeatureCard` components (defined within `page.tsx`). These cards have entrance animations.
        *   Includes a "Contact Sales" form (`src/components/shared/ContactSalesForm.tsx`) at the bottom.
        *   If user is authenticated, this page handles redirection to the appropriate role-based dashboard.
    *   **Styling & Animation:** `tailwind.config.ts` (for animations like `fade-in-up`, `text-pulse`), `src/app/globals.css` (for overall theme).

2.  **Header (Unauthenticated):**
    *   **Primary Frontend File:** `src/components/layout/Header.tsx`.
    *   **Functionality:**
        *   Displays the application logo (`Logo.tsx`).
        *   Conditionally shows navigation links: "Login", "Sign Up", "Register School" based on the current `pathname` to avoid redundant links. (e.g., "Login" button is hidden on the `/login` page).
        *   Theme toggle button (Sun/Moon icons).
        *   Mobile menu (`Sheet` component) with similar conditional links.
    *   **State Management:** Uses `useAuth()` from `src/context/AuthContext.tsx` to check authentication state and `useTheme()` from `src/context/ThemeContext.tsx`.

3.  **Footer:**
    *   **Primary Frontend File:** `src/app/layout.tsx` (within `RootLayout`).
    *   **Functionality:** Displays copyright information and decorative educational icons (`lucide-react`). The "Contact Sales" form was moved from here to `page.tsx`.

#### B. Authentication System

1.  **User Signup (Single Step, Role-Based Comprehensive):**
    *   **Primary Frontend File:** `src/app/signup/page.tsx`.
    *   **Workflow:**
        1.  User selects role (Student, Teacher, Parent) from a dropdown.
        2.  Based on selected role, relevant form fields for both base user info (username, email, password) and detailed profile info (full name, school, class, profile picture, role-specific details) appear dynamically.
        3.  Dropdowns for School, Class (filtered by selected school), and Subject (for teachers) are populated by API calls (e.g., to `/api/schools/`, `/api/classes/?school={id}`, `/api/subjects/`).
        4.  User fills the comprehensive form and can upload an optional profile picture.
        5.  On submit, `FormData` (to handle file upload) is created.
        6.  The `onSubmit` function calls `api.post('/signup/', formData, true)` from `src/lib/api.ts`.
        7.  Redirects to `/login` page on success.
    *   **Backend Processing:**
        *   **Django View:** `accounts/views.py` - `UserSignupView` (a `CreateAPIView`).
        *   **Django Serializer:** `accounts/serializers.py` - `UserSignupSerializer`.
            *   This serializer is designed to accept all base user fields and all potential profile fields for all roles.
            *   The `create()` method first creates the `CustomUser`.
            *   Then, based on the `role` in `validated_data`, it extracts profile-specific data, creates the corresponding profile model (`StudentProfile`, `TeacherProfile`, or `ParentProfile`), links it to the user, and saves it. Handles `profile_picture` upload and linking ForeignKeys/M2M fields.

2.  **User Login:**
    *   **Primary Frontend File:** `src/app/login/page.tsx`.
    *   **Workflow:**
        1.  User enters username and password into the form.
        2.  `onSubmit` function is triggered.
        3.  Calls `loginUser(credentials)` which internally calls `AuthContext.login(token)`.
        4.  `AuthContext.login()` makes a POST request via `api.post('/token-auth/', credentials)` from `src/lib/api.ts` to the Django backend.
        5.  **Backend Processing (Django):**
            *   The URL `/api/token-auth/` maps to `rest_framework.authtoken.views.obtain_auth_token` (defined in `stepwise_backend/urls.py`).
            *   This view validates credentials. If valid, it returns an authentication token.
        6.  **Frontend (Post-Success):**
            *   The token is stored in `localStorage`.
            *   `AuthContext.fetchCurrentUser()` is called, which makes a GET request to `/api/users/me/` to get full user details (including role and profiles).
            *   The `currentUser` state in `AuthContext` is updated.
            *   `login/page.tsx` then calls `router.push('/')` to redirect to the homepage.
            *   `src/app/page.tsx` (`UnifiedDashboardPage`) then handles redirection to the appropriate role-based dashboard.

3.  **Authentication Context & State Management:**
    *   **Primary Frontend File:** `src/context/AuthContext.tsx`.
    *   **Key Functions:**
        *   `AuthProvider`: Wraps the application, provides context.
        *   `useAuth`: Hook to access context values (`currentUser`, `isLoadingAuth`, `login`, `logout`).
        *   `useEffect` (on mount): Attempts to load token from `localStorage` and call `fetchCurrentUser`.
        *   `login(token)`: Stores token, calls `fetchCurrentUser`, updates `currentUser`.
        *   `logout()`: Removes token, sets `currentUser` to null, forces redirect to `/login`.
        *   `processUserData()`: Helper to derive `profile_completed` flag from nested profile data.

4.  **Logout:**
    *   **Trigger:** "Logout" button in `Header.tsx` or sidebar footers.
    *   **Action:** Calls `logout()` from `AuthContext`.
    *   **Workflow:** `AuthContext.logout()` clears token, user state, and forces a redirect to `/login` via `window.location.href`.

#### C. School Registration

1.  **Registration Form & Process:**
    *   **Primary Frontend File:** `src/app/register-school/page.tsx`.
    *   **Workflow:**
        1.  User fills form with school details (name, ID code, license, email, phone, address, principal info) and initial admin account details (username, email, password).
        2.  On submit, form data is sent via `api.post('/schools/', payload)` from `src/lib/api.ts`.
        3.  Redirects to `/login` on success.
    *   **Backend Processing:**
        *   **Django View:** `accounts/views.py` - `SchoolViewSet` (`create` action, permission `AllowAny`).
        *   **Django Serializer:** `accounts/serializers.py` - `SchoolSerializer`.
            *   The `create()` method creates the initial `CustomUser` for the school admin (with `role='Admin'`, `is_school_admin=True`, `is_staff=False`).
            *   It then creates the `School` record, linking the new admin user via `admin_user` field and also setting the `school` field on the admin `CustomUser` instance.

#### D. User Profile Management (Editing Existing Profiles)

1.  **Central Profile Editing Page:**
    *   **Primary Frontend File:** `src/app/profile/page.tsx`.
    *   **Functionality:** Allows authenticated users to view and edit their base `CustomUser` info (username, email, password) and their role-specific detailed profile information (`StudentProfile`, `TeacherProfile`, or `ParentProfile`).
    *   **Workflow:**
        1.  Loads current user data from `AuthContext.currentUser`.
        2.  Populates form fields. Dropdowns for School, Class (filtered by School), Subjects are fetched via API calls if applicable to the user's role.
        3.  User makes changes, optionally uploads a new profile picture.
        4.  On submit, `FormData` is created.
        5.  `api.patch(`/users/${currentUser.id}/profile/`, formData, true)` is called.
        6.  **Backend Processing:**
            *   **Django View:** `accounts/views.py` - `CustomUserViewSet.update_profile` action. This action expects `PATCH` requests.
            *   **Django Serializer:** Uses `CustomUserSerializer` which can handle partial updates. Internally, based on the data provided, it may also use `StudentProfileCompletionSerializer`, `TeacherProfileCompletionSerializer`, or `ParentProfileCompletionSerializer` (or the main profile serializers) to update nested profile data.
            *   The `update_profile` action handles updating `CustomUser` fields, and finding/updating the related profile model (Student, Teacher, or Parent), including profile picture uploads and linking M2M/FK fields. It ensures `profile_completed` is set to `true` on the specific profile upon successful update of required fields. `user.refresh_from_db()` is called before returning the response.
        7.  **Frontend (Post-Success):** The `AuthContext.setCurrentUser()` is called with the updated user object returned from the API, refreshing the application's user state.

#### E. Student Specific Flow

1.  **Student Dashboard:**
    *   **Entry Point:** `/student`. (Redirection from `/` is handled by `src/app/page.tsx`).
    *   **Primary Frontend File:** `src/app/student/page.tsx`. This page verifies auth and role, then renders `<StudentDashboard />`.
    *   **Main Component:** `src/components/dashboard/StudentDashboard.tsx`.
    *   **Data Fetching:**
        *   Fetches enrolled class and subject data via `/api/classes/?school={studentSchoolId}` (or a more specific endpoint if student is enrolled in a single class). The `ClassSerializer` on the backend nests `SubjectSerializer` which nests `LessonSerializer`.
        *   Fetches books from `/api/books/` (potentially filtered by student's school/class).
        *   Fetches upcoming events from `/api/events/` (filtered for relevance).
    *   **Display:** Uses `ClassSection.tsx` and `SubjectCard.tsx` to display content. Links to Rewards, AI Suggestions, Reports, Forum.

2.  **Viewing Learning Content (Lessons & Quizzes):**
    *   **Subject Detail Page:** `src/app/student/learn/class/[classId]/subject/[subjectId]/page.tsx`.
        *   Fetches subject details (including its lessons) via `/api/subjects/{subjectId}/`.
        *   Displays lessons, visually indicating `is_locked` status (derived from `LessonSerializer.get_is_locked` on backend).
    *   **Lesson Detail Page:** `src/app/student/learn/class/[classId]/subject/[subjectId]/lesson/[lessonId]/page.tsx`.
        *   Fetches lesson details via `/api/lessons/{lessonId}/`. The `LessonSerializer` nests `QuizSerializer` which nests `QuestionSerializer` etc.
        *   Displays lesson content (text, video, audio, image).
        *   **Quiz Interaction:**
            *   If `lesson.quiz` exists, renders the quiz form.
            *   User selects answers.
            *   On submit, calls `api.post(`/quizzes/{quizId}/submit_quiz/`, { answers: [...] })`.
            *   **Backend Quiz Submission:** `content/views.py` - `QuizViewSet.submit_quiz` action. Calculates score, checks against `quiz.pass_mark_percentage`, creates `UserQuizAttempt` record (sets `passed=True/False`), and returns result.
            *   Frontend displays quiz result. If failed and `lesson.simplified_content` exists, `showSimplified` state might be triggered.
            *   If quiz passed, `UserLessonProgress` might be updated (e.g., by calling `/api/userprogress/` to mark lesson complete).
        *   **AI Note Taker:** Placeholder UI. Would call an AI endpoint (e.g., `/api/ai/notes/`).

3.  **Student Rewards:**
    *   **Frontend Page:** `src/app/student/rewards/page.tsx`.
    *   **Data Fetching:**
        *   `/api/rewards/` (fetches all available `Reward` objects - `RewardViewSet`).
        *   `/api/user-rewards/?user={currentUser.id}` (fetches `UserReward` objects specific to the student - `UserRewardViewSet`).
    *   **Display:** Merges data to show unlocked and locked badges.

4.  **AI Learning Suggestions:**
    *   **Frontend Page:** `src/app/student/recommendations/page.tsx` (renders `LearningSuggestions` component from `src/components/recommendations/LearningSuggestions.tsx`).
    *   **Workflow:**
        *   Component attempts to fetch prerequisite data (student performance summary, available lessons/videos/quizzes - currently placeholders or needs specific API endpoints).
        *   Calls Genkit flow `personalizedLearningSuggestions` (defined in `src/ai/flows/personalized-learning-suggestions.ts`) with this input.
        *   Displays formatted suggestions.

#### F. Teacher Specific Flow

1.  **Teacher Dashboard:**
    *   **Entry Point:** `/teacher`.
    *   **Primary Frontend File:** `src/app/teacher/page.tsx` (renders `<TeacherDashboard />`).
    *   **Main Component:** `src/components/dashboard/TeacherDashboard.tsx`.
    *   **Data Fetching:**
        *   Student count: `/api/users/?role=Student&school={teacherSchoolId}`.
        *   Upcoming events: `/api/events/?school={teacherSchoolId}`.
        *   Other stats (Active Courses, Pending Reviews) are currently placeholders ("N/A - Needs API").
        *   Recent activity: Placeholder ("API integration needed").

2.  **Content Management (Lessons, Quizzes, Books):**
    *   **Overview Page:** `src/app/teacher/content/page.tsx`.
        *   Fetches recent lessons from `/api/lessons/`, quizzes from `/api/quizzes/`, books from `/api/books/` (all should be filtered by teacher's school on backend or frontend).
        *   Links to creation pages.
    *   **Lesson Creation:** `src/app/teacher/content/lessons/create/page.tsx`.
        *   Form with fields for title, content, media URLs, order, `requires_previous_quiz`.
        *   Cascading dropdowns: School (auto-filled from teacher's profile) -> Class -> Subject.
        *   On submit, calls `api.post('/lessons/', payload)`.
        *   **Backend:** `content/views.py` - `LessonViewSet.perform_create` handles associating with correct school/subject.
    *   **Quiz Creation:** `src/app/teacher/content/quizzes/create/page.tsx`.
        *   Form with fields for title, description, pass mark, and dynamic fields for questions and choices.
        *   Cascading dropdowns to select School -> Class -> Subject -> Lesson to associate quiz with.
        *   On submit, calls `api.post('/quizzes/', payload)`.
        *   **Backend:** `content/views.py` - `QuizViewSet.perform_create` handles associating with correct lesson and saving questions/choices.
    *   **Manage Books:** `src/app/teacher/content/books/page.tsx`.
        *   Lists books from `/api/books/` (filtered by teacher's school).
        *   Placeholder for upload/edit functionality.
        *   **Backend:** `content/views.py` - `BookViewSet`.

3.  **Report Card Generation (AI):**
    *   **Frontend Page:** `src/app/teacher/report-card/page.tsx` (renders `ReportCardGenerator` from `src/components/report-card/ReportCardGenerator.tsx`).
    *   **Workflow:**
        *   Teacher fills form with student name, class level, test scores.
        *   Frontend calls Genkit flow `generateFinalReportCard` (defined in `src/ai/flows/final-report-card.ts`).
        *   Displays generated report card text. (Note: Saving this report to backend is not yet implemented).

#### G. Parent Specific Flow

1.  **Parent Dashboard:**
    *   **Entry Point:** `/parent`.
    *   **Primary Frontend File:** `src/app/parent/page.tsx` (renders `<ParentDashboard />`).
    *   **Main Component:** `src/components/dashboard/ParentDashboard.tsx`.
    *   **Data Fetching:**
        *   Linked children: `/api/parent-student-links/?parent={currentUser.id}` (Backend: `ParentStudentLinkViewSet`).
        *   Upcoming events: `/api/events/` (filtered for relevance, e.g., school-wide for children's schools).

2.  **Child Linking & Management:**
    *   **Primary Frontend File:** `src/app/parent/children/page.tsx`.
    *   **Functionality:**
        *   Lists already linked children.
        *   "Link New Child" dialog: Parent enters child's admission number and school ID code.
        *   On submit, calls `api.post('/parent-student-links/link-child-by-admission/', payload)`.
        *   **Backend Processing:** `accounts/views.py` - `ParentStudentLinkViewSet.link_child_by_admission` action.
            *   Verifies student exists with `admission_number` and `school.school_id_code`.
            *   Crucially, checks if `student_profile.parent_email_for_linking` matches the requesting parent's email (`request.user.email`).
            *   If all checks pass, creates the `ParentStudentLink`.
            *   Returns student details for confirmation on the frontend.
        *   Frontend updates list of children upon successful linking.

#### H. School Admin Specific Flow

1.  **School Admin Dashboard:**
    *   **Entry Point:** `/school-admin/[schoolId]`.
    *   **Primary Frontend File:** `src/app/school-admin/[schoolId]/page.tsx`.
    *   **Data Fetching:**
        *   School details: `/api/schools/{schoolId}/`.
        *   Student/Staff count: `/api/users/?school={schoolId}&role=Student` and `/api/users/?school={schoolId}&role=Teacher`.
        *   Featured Teachers: `/api/users/?school={schoolId}&role=Teacher&page_size=5`.
        *   Upcoming Events: `/api/events/?school={schoolId}`.
    *   **Display:** Stat cards, event list, teacher list, placeholders for performance charts and AI tool.

2.  **School Calendar Management:**
    *   **Frontend Page:** `src/app/school-admin/[schoolId]/calendar/page.tsx`.
    *   **Functionality:**
        *   Displays ShadCN calendar.
        *   "Add New Event" dialog with form (title, description, date, type, optional target class).
        *   On submit, calls `api.post('/events/', payload)` with `school: schoolId` automatically included.
        *   Fetches and displays events specific to `schoolId`.
    *   **Backend:** `notifications/views.py` - `EventViewSet`. `perform_create` ensures event is linked to the correct school by school admin.

3.  **School Communication (Announcements):**
    *   **Frontend Page:** `src/app/school-admin/[schoolId]/communication/page.tsx`.
    *   **Functionality:**
        *   "New Announcement" dialog/form (title, message, optional target class).
        *   On submit, calls `api.post('/events/', payload)` (treating announcements as 'General' type events, linked to `schoolId`).
        *   Lists recent 'General' type events for the school.
    *   **Backend:** `notifications/views.py` - `EventViewSet`.

#### I. Shared Features / System-wide Components

1.  **Layout & Navigation System:**
    *   **Main Layout:** `src/app/layout.tsx` (contains `RootLayout` which includes `ThemeProvider`, `AuthProvider`).
    *   **App Shell:** `src/components/layout/MainAppShell.tsx`. This is a crucial client component that:
        *   Wraps the main page content for authenticated users.
        *   Uses `useAuth()` and `usePathname()`.
        *   Conditionally renders the appropriate role-specific sidebar (`StudentSidebarNav`, `TeacherSidebarNav`, `ParentSidebarNav`, `SchoolAdminSidebarNav`) based on `currentUser.role`.
        *   Manages the `SidebarProvider` from `src/components/ui/sidebar.tsx` to enable collapsible sidebar functionality.
        *   Renders the main `Header`.
    *   **Header:** `src/components/layout/Header.tsx`.
        *   Displays `Logo`.
        *   Conditional navigation links (Dashboard, Rewards, Forum, etc.) based on auth status and role.
        *   User profile dropdown (Profile, Logout) or Login/Signup/Register School buttons.
        *   Mobile menu (`Sheet` component).
    *   **Role-Specific Sidebars:** (e.g., `src/components/layout/StudentSidebarNav.tsx`)
        *   Contain navigation links specific to that user role's section of the application.
        *   Use `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` from `src/components/ui/sidebar.tsx`.
    *   **Custom Sidebar Toggle:** `src/components/layout/CustomSidebarToggle.tsx`.
        *   Provides `<` and `>` icons for collapsing/expanding the sidebar, positioned mid-sidebar.

2.  **Theme Management:**
    *   **Context:** `src/context/ThemeContext.tsx`. Manages `theme` state ('light', 'dark', 'system'), persists to `localStorage`, provides `setTheme` function.
    *   **Global Styles:** `src/app/globals.css`. Defines CSS variables for light and dark themes (e.g., `--background`, `--primary`, `--card`).
    *   **Toggle UI:** Theme selection `Select` components are located in individual role settings pages (e.g., `src/app/student/settings/page.tsx`).

---

This enhanced document provides a more detailed narrative of how key features are structured and interact. For truly exhaustive diagrams and function-level mapping, you would typically use specialized modeling tools and maintain that as separate, living documentation alongside the codebase. This Markdown document serves as a strong conceptual guide.
