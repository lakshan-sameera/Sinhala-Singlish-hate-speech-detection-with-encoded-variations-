# ModerateAI - Sinhala Hate Speech Detection System

## Overview

ModerateAI is a full-stack web application designed to detect and moderate hate speech in Sinhala and Singlish text content. The system features a real Python machine learning backend with custom CSV training support, automated content neutralization, and a comprehensive dashboard for manual review and system management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using React with TypeScript and follows a component-based architecture:
- **React Router**: Uses Wouter for client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite for development and bundling

### Backend Architecture
The backend follows a RESTful API pattern using Express.js:
- **Framework**: Express.js with TypeScript
- **API Structure**: RESTful endpoints for content analysis, moderation queue, and system stats
- **Middleware**: Custom logging, JSON parsing, and error handling
- **Development**: Vite integration for SSR and HMR in development

### Data Storage
The application uses PostgreSQL database with Drizzle ORM:
- **Production Database**: PostgreSQL with Drizzle ORM for data persistence
- **Database Provider**: Neon serverless PostgreSQL 
- **Schema Management**: Type-safe database schema definitions using Drizzle and Zod
- **ORM Features**: Full CRUD operations, relations, and migrations

## Key Components

### Content Analysis Engine
- **Python ML Backend**: Real scikit-learn model with TF-IDF vectorization and Logistic Regression
- **Custom Training**: CSV file upload support for domain-specific hate speech patterns
- **Text Processing**: Analyzes Sinhala/Singlish text with feature extraction and hate word detection
- **Classification**: Categorizes content as "safe", "flagged", or "hate_speech" with 100% accuracy on training data
- **Confidence Scoring**: Detailed hate, harassment, and normal content scores from real ML predictions
- **Auto-moderation**: Automatically hides high-confidence problematic content
- **Neutralizer**: Converts detected hate speech into neutral abstract sentences for safe display

### Moderation System
- **Queue Management**: Priority-based moderation queue for manual review
- **Review Workflow**: Human moderator approval/rejection workflow
- **Status Tracking**: Tracks content through pending, approved, and removed states
- **Real-time Updates**: Live updates for moderation queue changes

### Dashboard & Analytics
- **Real-time Stats**: System-wide statistics and performance metrics
- **Activity Monitoring**: Recent activity feed with classification results
- **Analytics Views**: Detection rates, accuracy metrics, and usage statistics
- **Configuration Panel**: System settings and threshold adjustments

### User Interface
- **Responsive Design**: Mobile-first design with desktop optimization
- **Dark Mode Support**: Complete dark/light theme system
- **Component Library**: Comprehensive UI components with consistent styling
- **Real-time Feedback**: Toast notifications and live data updates

## Data Flow

### Analysis Workflow
1. User submits text content through the analyzer interface
2. Backend processes content through ML classification pipeline
3. System generates confidence scores and classification labels
4. High-confidence problematic content is auto-flagged for review
5. Results are stored in database and returned to frontend
6. Dashboard updates with new statistics and activity

### Moderation Workflow
1. Flagged content enters the moderation queue with priority levels
2. Human moderators review content through the moderation interface
3. Moderators can approve (restore) or remove content
4. Actions update content status and remove items from queue
5. System statistics are updated to reflect moderation decisions

### Real-time Updates
- Content analysis results trigger immediate UI updates
- Moderation queue refreshes every 5-10 seconds
- System statistics update every 30 seconds
- Toast notifications provide immediate user feedback

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router
- **date-fns**: Date manipulation and formatting

### UI Dependencies
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variants
- **lucide-react**: SVG icon library

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type safety and development experience
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations handle schema changes
- **Assets**: Static assets served from build output

### Environment Configuration
- **Database**: Requires `DATABASE_URL` for PostgreSQL connection
- **Development**: Uses Vite dev server with HMR and middleware
- **Production**: Serves static files and API from single Express server

### Deployment Requirements
- Node.js runtime environment
- PostgreSQL database (Neon serverless recommended)
- Environment variables for database connection
- Process manager for production server management

### Development Workflow
- `npm run dev`: Starts development server with hot reload
- `npm run build`: Builds production bundle
- `npm run start`: Runs production server
- `npm run db:push`: Applies database schema changes