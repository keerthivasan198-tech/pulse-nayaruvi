# pulse-nayaruvi

Production-ready Project Management & Workspace Platform powered by React, Tailwind CSS, and Firebase Realtime Database.

## Features

- **Multi-Workspace Architecture**: Isolated workspaces with dynamic switching and custom role management (`Founder`, `Co-Founder`, `Admin`, `Member`, `Viewer`).
- **Hierarchical Project Trees**: Workspaces host individual projects with dedicated allocated members, task boards, checklists, and activity feeds.
- **Real-Time Kanban Boards**: Drag-and-drop task management (`To Do`, `In Progress`, `Review`, `Completed`) with priorities, dates, and image attachments.
- **Interactive Checklists**: Drag-and-drop checklist tracking with instant progress percentage.
- **Activity & Announcements**: Team notifications, Google Meet integration, and workspace-wide announcements.
- **Firebase Realtime Database**: Sub-100ms synchronization across all clients with secure database rules.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Hello-Pangea DnD, Framer Motion, TipTap Editor
- **Backend / Database**: Firebase Realtime Database, Firebase Authentication, Firebase Hosting, Express (Optional utilities)

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally
```bash
npm run dev
```

### 3. Build & Deploy to Firebase
```bash
npm run build
npm run deploy
```
Live URL: [https://pulsenayaruvi.web.app](https://pulsenayaruvi.web.app)
