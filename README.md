# 🔐 PassAPI — React Password Manager Frontend

A modern, secure password manager frontend built with React 19, featuring a clean interface for managing secrets, generating strong passwords, and secure authentication. Designed with performance, security, and user experience in mind.

## 🎥 Project Overview

PassAPI is a full-featured password manager that helps users securely store, manage, and generate passwords. The frontend provides an intuitive interface for:

- **Secure Authentication**: JWT-based login/register system
- **Password Management**: Store, organize, and access your credentials
- **Password Generation**: Create strong, customizable passwords
- **Security Features**: Password strength analysis, secure clipboard operations
- **Modern UI/UX**: Responsive design with smooth interactions

> **Note**: This repository contains only the frontend. You need a compatible backend API running locally for full functionality.


## Features

### 🔐 Security & Authentication
- Secure JWT-based authentication with token expiry validation
- Protected routes with automatic redirect on session expiry
- Comprehensive error boundaries for graceful error handling
- Input validation and sanitization

### 📊 Secrets Management
- **Dashboard**: List, search, and manage all your secrets
- **Password Visibility**: Toggle between masked/unmasked password view
- **Password Strength**: Real-time strength indicator with visual feedback
- **Quick Actions**: Copy passwords, emails, and websites to clipboard
- **CRUD Operations**: Create, edit, and delete secrets with validation
- **Search & Filter**: Fast search across titles, usernames, emails, and websites

### 🔑 Password Generator
- **Customizable Length**: Generate passwords from 6-64 characters
- **Special Characters**: Toggle special symbols inclusion
- **Rate Limiting**: Built-in cooldown to prevent API abuse
- **One-Click Copy**: Instant clipboard integration

### 🎨 User Experience
- **Responsive Design**: Clean, modern interface with Tailwind CSS v4
- **Sidebar Navigation**: Intuitive navigation with active state indicators
- **Loading States**: Visual feedback for all async operations
- **Error Handling**: User-friendly error messages and recovery options
- **Performance Optimized**: Memoized components and efficient re-renders

### 🛠️ Technical Features
- **React 19** with modern hooks and functional components
- **Vite 7** for fast development and optimized builds
- **Error Boundaries** for robust error handling
- **Component Architecture**: Modular, reusable components
- **Performance Monitoring**: Optimized for minimal re-renders


## 🛠️ Tech Stack
- **React 19** - Modern React with hooks and functional components
- **Vite 7** - Fast build tool and development server
- **React Router DOM 7** - Client-side routing with protected routes
- **Axios** - HTTP client with request/response interceptors
- **Tailwind CSS 4** - Utility-first CSS framework via Vite plugin
- **ESLint** - Code linting and quality assurance


## Prerequisites
- Node.js LTS (v18+ recommended)
- npm (comes with Node) or a compatible package manager
- A backend API running locally (default base URL: http://localhost:8080)


## Getting Started
1) Clone the repository
- git clone <repo-url>
- cd Web

2) Install dependencies
- npm install

3) Configure backend URL (optional)
During development, API calls are proxied by Vite to your backend. No change is needed in src\api.js (it uses baseURL '/'). If your backend runs on a different host/port, update the proxy targets in:
- vite.config.js → server.proxy for '/auth' and '/secret'
For production, serve the frontend from the same origin as the backend or configure your reverse proxy accordingly.

4) Run the development server
- npm run dev
Then open the URL printed by Vite (typically http://localhost:5173).

5) Build for production
- npm run build

6) Preview the production build locally
- npm run preview


## Application Overview
- Authentication lives at the root route “/” with tabs for Login and Register.
- After successful login, a JWT token is stored in localStorage as "token".
- Protected areas are wrapped by components/RequireAuth.jsx. Without a valid token, users are redirected to "/".
- Sidebar navigation appears inside the protected Layout and links to the Secrets dashboard and the Password generator page.


## Routes
- / → Auth page (Login/Register)
- /dashboard → SecretsDashboard (protected)
- /secrets/create → CreateSecret (protected)
- /generate → PasswordGenerator component (protected via Layout)
- /generate-password → PasswordPage wrapper (also protected)


## API Endpoints Used (frontend expectations)
Development: requests are sent to '/auth' and '/secret' and proxied by Vite to http://localhost:8080 (configurable in vite.config.js).

Auth
- POST /auth/api/login
  - body: { email, password }
  - response: { data: { token } }
- POST /auth/api/register
  - body: { name, email, password }
  - response: should include a token or similar credential; UI expects to navigate after success

Secrets
- GET /secret/api/list → returns { data: { secrets: Secret[] } }
- POST /secret/api/create → body includes { title, username, password, email, website, note }
- PUT /secret/api/update/:id → update an existing secret
- DELETE /secret/api/delete/:id → delete a secret
- POST /secret/api/generatepassword → body: { length, include_special_symbol }
  - returns { data: { password } }

Auth Token
- Stored in localStorage under key "token"
- Attached to requests via Axios interceptor as Authorization: Bearer <token>


## Project Structure
- index.html — Vite entry HTML
- src/
  - main.jsx — React entry point
  - App.jsx — App routes and layout wiring
  - api.js — Axios instance and auth header injection
  - index.css — Tailwind CSS entry (see Tailwind setup)
  - layout/
    - Layout.jsx — Protected shell with sidebar + Logout
  - components/
    - RequireAuth.jsx — Redirects to "/" if no token
    - LoginForm.jsx — Login UI and logic
    - RegisterForm.jsx — Registration UI and logic
    - LogoutButton.jsx — Clears token and navigates to "/"
    - PasswordGenerator.jsx — Generator UI calling /secret/api/generatepassword
  - pages/
    - Auth.jsx — Holds login/register tabs
    - SecretsDashboard.jsx — Lists secrets, edit/delete, inline create, copy & visibility toggles
    - CreateSecret.jsx — Separate create form page
    - PasswordPage.jsx — Thin wrapper around PasswordGenerator
  - utils/
    - tokenUtils.jsx — Helpers for token validation/clearing

Config
- package.json — scripts and dependencies
- vite.config.js — React and Tailwind plugin
- eslint.config.js — ESLint config (optional during dev)


## Styling (Tailwind CSS v4)
Tailwind v4 is enabled via the official Vite plugin (@tailwindcss/vite). Global styles are imported in src\index.css. No separate tailwind.config.js is necessary for the default setup.


## Development Notes
- Rate limiting: The UI includes simple client-side throttling/backoff for list and generator endpoints. If your backend returns 429 with Retry-After, the UI tries to honor it.
- Strict Mode: Some components include guards to avoid duplicate side effects in React StrictMode during development.
- Token expiry: utils/tokenUtils.jsx includes helpers to detect JWT expiry; some pages clear token and redirect on 401.


## Troubleshooting
- Cannot login/register:
  - Ensure your backend is running and baseURL in src\api.js points to it.
  - Inspect the browser console/network tab for errors from the API.
- Getting redirected back to "/":
  - You may be missing a token or it has expired. Log in again.
- 429 Too Many Requests:
  - Wait a few seconds and try again. The UI will back off automatically in some flows.


## Scripts
- npm run dev — Start Vite dev server
- npm run build — Production build
- npm run preview — Preview the production build
- npm run lint — Run ESLint


## 🚀 Recent Improvements

### Security Enhancements
- Fixed critical hardcoded credentials vulnerability
- Enhanced JWT token validation with expiry checking
- Improved input validation and error handling

### Performance Optimizations
- Memoized expensive computations (password strength, search filtering)
- Optimized component re-renders with proper dependency management
- Reduced unnecessary API calls with intelligent caching

### Code Quality
- Added comprehensive error boundaries for graceful error handling
- Refactored complex components into smaller, maintainable modules
- Improved component architecture with better separation of concerns
- Enhanced user feedback with better loading states and error messages

### Developer Experience
- Modular component structure for better maintainability
- Consistent error handling patterns across the application
- Improved code organization with dedicated routes and components directories

## License