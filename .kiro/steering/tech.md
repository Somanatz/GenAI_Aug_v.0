# Technology Stack

## Architecture
**Full-Stack Application**: Next.js frontend + Django REST API backend

### Frontend Stack
- **Framework**: Next.js 15.2.3 with App Router
- **Runtime**: React 18.3.1
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.1 with custom design system
- **UI Components**: ShadCN UI + Radix UI primitives
- **State Management**: React Context (AuthContext, ThemeContext)
- **HTTP Client**: Native fetch API via custom `src/lib/api.ts`
- **Forms**: React Hook Form with Zod validation
- **AI Integration**: Genkit 1.8.0 for AI flows and Google AI integration
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React for consistent iconography

### Backend Stack
- **Framework**: Django 5.1.9 with Django REST Framework
- **Language**: Python 3.11.11
- **Database**: SQLite (development), configurable for production
- **Authentication**: Token-based authentication (DRF TokenAuthentication)
- **File Storage**: Local media files in `/media/` directory
- **Email**: SMTP backend (Gmail configuration)
- **CORS**: django-cors-headers for frontend integration
- **Filtering**: django-filter for API query filtering
- **Pagination**: DRF PageNumberPagination (10 items per page)

### Development Tools
- **Package Manager**: npm (frontend), pip (backend)
- **Build Tool**: Next.js with Turbopack (dev mode)
- **Linting**: ESLint (disabled during builds)
- **Type Checking**: TypeScript compiler
- **Environment**: dotenv for environment variable management

## Common Commands

### Frontend Development
```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run typecheck

# Linting
npm run lint

# Genkit AI development
npm run genkit:dev
npm run genkit:watch
```

### Backend Development
```bash
# Django development server
python manage.py runserver

# Database migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files (production)
python manage.py collectstatic

# Django shell
python manage.py shell
```

### Environment Setup
- Frontend runs on `http://localhost:3000`
- Backend runs on `http://localhost:8000`
- Environment variables in `.env` and `.env.local`
- CORS configured for localhost development (ports 3000, 127.0.0.1:3000, 192.168.1.9:3000)

## Key Dependencies

### Frontend
- **UI Framework**: @radix-ui components, lucide-react icons, tailwindcss-animate
- **Data Management**: @tanstack/react-query, date-fns, recharts
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **Utilities**: class-variance-authority, clsx, tailwind-merge
- **AI**: @genkit-ai/googleai, @genkit-ai/next, genkit

### Backend
- **API**: djangorestframework, django-cors-headers, django-filter
- **Environment**: python-dotenv
- **Authentication**: Built-in DRF TokenAuthentication

## Authentication Flow
- Custom User model (`accounts.CustomUser`) with role-based access
- Token-based authentication for API requests
- Role-specific dashboard routing (Student, Teacher, Parent, School Admin)
- Profile completion tracking with nested serializers

## File Upload Handling
- FormData for multipart uploads (profile pictures, books, attachments)
- Media files stored in `/media/` with organized subdirectories
- Backend handles file validation and storage via Django's file handling