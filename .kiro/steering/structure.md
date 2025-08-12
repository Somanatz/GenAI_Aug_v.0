# Project Structure

## Root Directory Organization
```
├── src/                    # Next.js frontend source
├── stepwise_backend/       # Django project settings
├── accounts/              # Django app - user management
├── content/               # Django app - learning content
├── forum/                 # Django app - discussion forums
├── notifications/         # Django app - events & notifications
├── media/                 # User uploaded files
├── templates/             # Django email templates
├── docs/                  # Project documentation
├── public/                # Static assets (images, videos)
└── node_modules/          # Frontend dependencies
```

## Frontend Structure (`src/`)
```
src/
├── app/                   # Next.js App Router pages
│   ├── (auth)/           # Auth route group (login, signup, register-school)
│   ├── student/          # Student dashboard & learning features
│   │   ├── learn/        # Learning content (class/subject/lesson structure)
│   │   ├── rewards/      # Gamification and badges
│   │   ├── recommendations/ # AI-powered learning suggestions
│   │   └── settings/     # Student preferences
│   ├── teacher/          # Teacher dashboard & content management
│   │   ├── content/      # Lesson/quiz/book creation and management
│   │   └── report-card/  # AI report card generation
│   ├── parent/           # Parent dashboard & child monitoring
│   │   └── children/     # Child linking and management
│   ├── school-admin/     # School administration
│   │   └── [schoolId]/   # Dynamic school-specific admin pages
│   │       ├── calendar/ # Event management
│   │       └── communication/ # Announcements
│   ├── profile/          # User profile editing (all roles)
│   ├── globals.css       # Global styles and theme variables
│   ├── layout.tsx        # Root layout with providers
│   └── page.tsx          # Landing page with role-based redirection
├── components/           # Reusable React components
│   ├── ui/              # ShadCN base components (button, card, dialog, etc.)
│   ├── layout/          # Navigation components
│   │   ├── Header.tsx   # Main navigation header
│   │   ├── MainAppShell.tsx # Authenticated app wrapper
│   │   └── *SidebarNav.tsx  # Role-specific sidebar navigation
│   ├── dashboard/       # Role-specific dashboard components
│   ├── shared/          # Cross-role components (Logo, ContactSalesForm)
│   └── recommendations/ # AI learning suggestions components
├── context/             # React Context providers
│   ├── AuthContext.tsx  # Authentication state management
│   └── ThemeContext.tsx # Theme (light/dark/system) management
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and configurations
│   ├── api.ts          # Centralized HTTP client with token handling
│   └── utils.ts        # Utility functions
├── interfaces/          # TypeScript type definitions
└── ai/                  # Genkit AI flows and configuration
    ├── flows/          # AI flow definitions
    ├── genkit.ts       # Genkit configuration
    └── dev.ts          # Development server for AI flows
```

## Backend Structure (Django Apps)

### `accounts/` - User Management
- **Models**: CustomUser, StudentProfile, TeacherProfile, ParentProfile, School, ParentStudentLink
- **Purpose**: Authentication, user profiles, school registration, parent-child linking
- **Key Features**: Role-based user system, comprehensive signup, secure parent-child linking via admission number + email verification
- **ViewSets**: CustomUserViewSet, SchoolViewSet, ParentStudentLinkViewSet

### `content/` - Learning Content
- **Models**: Subject, Lesson, Quiz, Question, Book, UserProgress, UserQuizAttempt, Reward, UserReward
- **Purpose**: Educational content management, progress tracking, gamification
- **Key Features**: Hierarchical content (School → Class → Subject → Lesson → Quiz), progress tracking, rewards system
- **ViewSets**: SubjectViewSet, LessonViewSet, QuizViewSet, BookViewSet, RewardViewSet, UserRewardViewSet

### `forum/` - Discussion System
- **Models**: ForumPost, ForumReply, ForumCategory
- **Purpose**: Peer learning and Q&A discussions
- **Key Features**: Student collaboration, moderated discussions, file attachments

### `notifications/` - Events & Communication
- **Models**: Event, Notification
- **Purpose**: School calendar, announcements, system notifications
- **Key Features**: School-wide communication, event management, targeted messaging
- **ViewSets**: EventViewSet

## File Naming Conventions

### Frontend
- **Pages**: `page.tsx` (App Router convention)
- **Components**: PascalCase (e.g., `StudentDashboard.tsx`)
- **Utilities**: camelCase (e.g., `api.ts`, `utils.ts`)
- **Types**: PascalCase interfaces (e.g., `User.ts`)
- **Context**: PascalCase with "Context" suffix (e.g., `AuthContext.tsx`)

### Backend
- **Models**: PascalCase classes in `models.py`
- **Views**: PascalCase ViewSets in `views.py`
- **Serializers**: PascalCase classes in `serializers.py`
- **URLs**: kebab-case endpoints in `urls.py`

## Key Architectural Patterns

### Frontend Patterns
- **App Router**: File-based routing with route groups for organization
- **Context Providers**: Global state management (Auth, Theme) with localStorage persistence
- **Component Composition**: ShadCN + custom components with consistent styling
- **API Layer**: Centralized HTTP client in `src/lib/api.ts` with automatic token handling
- **Role-Based Routing**: Dynamic navigation and access control based on user role
- **MainAppShell**: Wrapper component that provides role-specific sidebar and layout

### Backend Patterns
- **Django Apps**: Feature-based app organization with clear separation of concerns
- **DRF ViewSets**: RESTful API endpoints with custom actions for complex operations
- **Custom User Model**: Extended authentication system with role-based profiles
- **Nested Serializers**: Complex data relationships with profile completion tracking
- **Permission Classes**: Role-based access control at the API level
- **Custom Actions**: ViewSet actions for specific operations (e.g., `submit_quiz`, `link_child_by_admission`)

### Cross-Stack Patterns
- **Token Authentication**: Stateless API authentication with automatic token refresh
- **Role-Based Access**: Frontend routing + backend permissions working together
- **File Upload**: FormData handling for media files with organized storage
- **CORS Configuration**: Development-friendly cross-origin setup
- **Cascading Dropdowns**: School → Class → Subject → Lesson hierarchy in forms
- **Profile Completion**: Multi-step user onboarding with completion tracking

## Media File Organization
```
media/
├── profile_pictures/     # User avatars (all roles)
├── books/               # Educational books/PDFs uploaded by teachers
├── student_resources/   # Learning materials and attachments
├── forum_attachments/   # Discussion file uploads
└── rewards_icons/       # Gamification assets and badge icons
```

## Configuration Files
- **Frontend**: `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `components.json`
- **Backend**: `stepwise_backend/settings.py`, `manage.py`
- **Environment**: `.env`, `.env.local` for secrets and configuration
- **Package Management**: `package.json` (frontend), requirements.txt would be for backend

## Route Structure Examples
- **Student Learning**: `/student/learn/class/[classId]/subject/[subjectId]/lesson/[lessonId]`
- **Teacher Content**: `/teacher/content/lessons/create`
- **School Admin**: `/school-admin/[schoolId]/calendar`
- **Parent Management**: `/parent/children`

## API Endpoint Patterns
- **Authentication**: `/api/token-auth/`, `/api/signup/`
- **User Management**: `/api/users/me/`, `/api/users/{id}/profile/`
- **Content**: `/api/lessons/`, `/api/quizzes/{id}/submit_quiz/`
- **School Data**: `/api/schools/`, `/api/classes/?school={id}`
- **Parent-Child**: `/api/parent-student-links/link-child-by-admission/`