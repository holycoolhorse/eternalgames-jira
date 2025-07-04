<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# EternalGames Jira - Project Management System

This is a full-stack JavaScript project management system similar to Jira/Trello with the following features:

## Architecture
- **Frontend**: React with Vite, TailwindCSS for styling
- **Backend**: Node.js with Express REST API
- **Database**: SQLite for data persistence
- **Authentication**: JWT-based with role management

## Key Features
- User management with roles (Admin, Member, Reader)
- Project and task management with Kanban boards
- Drag-and-drop functionality using @dnd-kit
- Comments with Markdown support and @mentions
- File uploads (max 5MB, 3 files per task)
- Email notifications and in-app alerts
- Responsive design (mobile-first)
- CSV export functionality
- Maximum 10 user license limit

## Development Guidelines
- Use modern JavaScript (ES6+) syntax
- Follow REST API conventions
- Implement proper error handling and validation
- Use responsive design patterns
- Follow security best practices for authentication
- Implement rate limiting and input validation
- Use environment variables for configuration
