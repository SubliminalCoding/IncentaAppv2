# Incenta Employee Advocacy App

A comprehensive healthcare advocacy platform designed to help employees navigate their healthcare benefits and resolve insurance-related issues with assistance from specialists.

## Overview

The Incenta Employee Advocacy App provides a seamless interface for employees to:
- Manage health insurance cases and issues
- Upload and store important healthcare documents
- Communicate with advocacy specialists
- View and understand their benefits
- Access a knowledge base of healthcare FAQs

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Authentication**: JWT-based authentication
- **File Storage**: AWS S3 or local filesystem
- **Frontend** (upcoming): React Native for mobile app, React for web portal

## Features

### Authentication & User Management
- User registration and login
- Role-based access control (users, specialists, admins)
- JWT token authentication with refresh tokens

### Case Management
- Create healthcare advocacy cases
- Track case status and updates
- Assign cases to specialists
- View case timeline

### Document Management
- Secure document upload and storage
- Support for various document types (EOBs, medical bills, etc.)
- Document metadata and categorization

### Messaging System
- Real-time messaging between users and specialists
- Conversation tracking
- Read status and notifications
- File attachments

### Benefits Information
- View health insurance plan details
- Manage dependents
- Enrollment options

### Knowledge Base
- Searchable FAQ database
- Categorized healthcare information

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- AWS account (optional, for S3 storage)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-organization/incenta-app.git
cd incenta-app
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env file with your configuration
```

4. Set up the database
```bash
# Create PostgreSQL database
createdb incenta_db

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

5. Start the server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Environment Variables

The application uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment (development/production) | development |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | PostgreSQL database name | incenta_db |
| DB_USER | PostgreSQL username | postgres |
| DB_PASSWORD | PostgreSQL password | - |
| JWT_SECRET | Secret for JWT tokens | - |
| JWT_EXPIRATION | JWT token expiration | 7d |
| USE_LOCAL_STORAGE | Use local storage instead of S3 | true |
| AWS_ACCESS_KEY_ID | AWS access key (for S3) | - |
| AWS_SECRET_ACCESS_KEY | AWS secret key (for S3) | - |
| AWS_REGION | AWS region (for S3) | us-east-1 |
| S3_BUCKET_NAME | S3 bucket name | incenta-documents |

## API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/auth/register | POST | Register a new user |
| /api/auth/login | POST | Authenticate a user |
| /api/auth/refresh-token | POST | Refresh access token |
| /api/auth/me | GET | Get current user profile |
| /api/auth/logout | POST | Logout user |
| /api/auth/update-profile | PUT | Update user profile |
| /api/auth/change-password | PUT | Change user password |

### Cases

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/cases | GET | Get all cases for user |
| /api/cases | POST | Create a new case |
| /api/cases/:id | GET | Get case by ID |
| /api/cases/:id | PUT | Update a case |
| /api/cases/:id/timeline | GET | Get case timeline |
| /api/cases/assigned | GET | Get cases assigned to specialist |
| /api/cases/:id/documents | POST | Attach document to case |

### Documents

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/documents | POST | Upload a document |
| /api/documents/:id | GET | Get document by ID |
| /api/documents/case/:caseId | GET | Get documents for a case |
| /api/documents/user | GET | Get user's documents |
| /api/documents/:id | DELETE | Delete a document |
| /api/documents/:id | PATCH | Update document metadata |

### Messaging

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/messaging/conversations | GET | Get all conversations |
| /api/messaging/conversations | POST | Create conversation |
| /api/messaging/conversations/:id | GET | Get conversation |
| /api/messaging/conversations/:id/messages | GET | Get messages |
| /api/messaging/conversations/:id/messages | POST | Send message |
| /api/messaging/conversations/:id/read | POST | Mark messages as read |
| /api/messaging/unread | GET | Get unread message count |
| /api/messaging/messages/:id | DELETE | Delete a message |

### Benefits

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/benefits | GET | Get user benefits |
| /api/benefits/:id | GET | Get benefit details |
| /api/benefits/dependents | GET | Get user dependents |
| /api/benefits/dependents | POST | Add a dependent |
| /api/benefits/dependents/:id | DELETE | Remove a dependent |
| /api/benefits/:id/enroll | POST | Enroll in a benefit |
| /api/benefits/:id/cancel | POST | Cancel enrollment |

### FAQs

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/faqs | GET | Get all FAQs |
| /api/faqs/categories | GET | Get FAQ categories |
| /api/faqs/category/:category | GET | Get FAQs by category |
| /api/faqs/search | GET | Search FAQs |
| /api/faqs/:id | GET | Get FAQ by ID |

## License

This project is licensed under the [MIT License](LICENSE).

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests. 