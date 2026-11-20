# Nayaruvi Pulse - Flutter Mobile App

Native cross-platform mobile application for **Nayaruvi Pulse**, linking directly to Firebase Realtime Database and Authentication, with full support for task management, Kanban boards, team announcements, and automated email notifications.

---

## Features

- **Authentication**: Email/Password sign-in & registration with Firebase Authentication.
- **Real-Time Database**: Direct streams to `pulsenayaruvi` Realtime Database for instant synchronization across Web and Mobile.
- **Workspaces & Projects**: Dynamic workspace switcher and project filter tabs.
- **Interactive Kanban Tasks**:
  - Filter by status (`All`, `To Do`, `In Progress`, `Review`, `Completed`)
  - 1-tap task completion toggle
  - Create new tasks with priority badges (`Urgent`, `High`, `Medium`, `Low`), due dates, and assignee picker
  - Automated assignee email dispatch upon task creation
  - Automated status update email dispatch to task assignor upon column/status change
- **Team Announcements & Activity**:
  - Live feed of workspace activities and announcements
  - Post Announcement modal with automated BCC email broadcast to all project/workspace members
- **Team Directory & Member Invites**:
  - Browse team members with their assigned project roles
  - Invite new members with automated invitation email dispatch
- **User Profile**:
  - Edit name and bio, persisted directly to `/users/{uid}` in Firebase RTDB
  - Sign out

---

## Brand Theme & Styling

- **Primary**: `#274245` (Pulse Navy / Emerald)
- **Background**: `#FAF7EC` (Warm Cream Canvas)
- **Accent**: `#DFD6AE` (Sand Gold)
- **Typography**: Google Fonts `Outfit` for headings and `Plus Jakarta Sans` for body text.

---

## How to Run

1. Open a terminal in this directory:
   ```bash
   cd flutter_app
   ```
2. Fetch dependencies:
   ```bash
   flutter pub get
   ```
3. Run on your connected device, emulator, Chrome, or Windows:
   ```bash
   flutter run
   ```
   Or specify device:
   ```bash
   flutter run -d chrome
   flutter run -d windows
   ```

---

## Directory Structure

```
flutter_app/
├── lib/
│   ├── constants/
│   │   └── theme.dart          # Pulse branding, colors, typography
│   ├── models/
│   │   └── models.dart         # Workspace, Project, Task, Activity, User models
│   ├── providers/
│   │   └── app_state.dart      # Reactive state management with Provider
│   ├── screens/
│   │   ├── auth/
│   │   │   └── login_screen.dart
│   │   ├── dashboard/
│   │   │   └── home_screen.dart # Shell with bottom navigation & workspace selector
│   │   ├── tasks/
│   │   │   ├── tasks_screen.dart
│   │   │   ├── add_task_dialog.dart
│   │   │   └── task_detail_sheet.dart
│   │   ├── activity/
│   │   │   └── activity_screen.dart
│   │   ├── team/
│   │   │   └── team_screen.dart
│   │   └── profile/
│   │       └── profile_screen.dart
│   ├── services/
│   │   ├── api_service.dart     # Calls backend notification APIs
│   │   ├── auth_service.dart    # Firebase Auth & profile sync
│   │   └── database_service.dart # Realtime Database streams & CRUD
│   ├── firebase_options.dart   # Cross-platform Firebase config
│   └── main.dart               # Entrypoint & AuthGate
├── pubspec.yaml
└── README.md
```
