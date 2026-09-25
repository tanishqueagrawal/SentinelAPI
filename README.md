# SentinelAPI

## Zero-Trust API Vulnerability Scanner

SentinelAPI is an API security testing platform that analyzes OpenAPI/Swagger specifications and controlled API environments to identify common security weaknesses.

It combines a React dashboard, Node.js backend, and Python-based security scanner to discover endpoints, execute security checks, collect evidence, and generate structured security reports.

---

## Problem

Modern applications depend heavily on APIs, but API endpoints can expose sensitive data or allow unauthorized access when authentication and authorization controls are incorrectly implemented.

SentinelAPI focuses on identifying security issues such as:

- BOLA / IDOR
- Excessive data exposure
- Authentication misconfiguration
- Missing or weak security documentation
- Potential rate-limit configuration issues
- Sensitive endpoint exposure

The scanner provides evidence and remediation guidance instead of only reporting that an endpoint may be vulnerable.

---

## Features

### API Discovery

- OpenAPI / Swagger specification support
- JSON and YAML specification parsing
- Automatic endpoint discovery
- HTTP method detection
- Endpoint security metadata extraction

### Security Testing

- BOLA / IDOR testing
- Authentication configuration analysis
- Excessive data exposure detection
- Sensitive endpoint analysis
- Passive OpenAPI security analysis
- Evidence collection

### Scanning Modes

#### Active Mode

Used for controlled or explicitly authorized APIs.

The scanner can send requests and analyze the responses to identify runtime security issues.

#### Passive Mode

Used for public or external API specifications where active testing is not appropriate.

The scanner analyzes the OpenAPI specification without sending security-testing requests.

---

## Dashboard

The SentinelAPI dashboard provides:

- Security posture score
- Vulnerability statistics
- Endpoint inventory
- Severity distribution
- Authentication/security scheme information
- Scan history
- Detailed vulnerability findings
- Evidence and remediation information
- JSON report export
- PDF security report

---

## Architecture

```text
                    ┌─────────────────────┐
                    │   React Dashboard   │
                    │  Vite + Tailwind    │
                    └──────────┬──────────┘
                               │
                         REST / JSON
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Node.js Backend   │
                    │      Express        │
                    └──────────┬──────────┘
                               │
                        Scanner Process
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Python Scanner    │
                    │                     │
                    │ OpenAPI Parser      │
                    │ BOLA / IDOR         │
                    │ Auth Analysis       │
                    │ Data Exposure       │
                    │ Passive Analysis    │
                    │ Evidence Collection │
                    └──────────┬──────────┘
                               │
                         API Requests
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Target API      │
                    │                     │
                    │ OpenAPI / Swagger   │
                    │ Controlled Sandbox  │
                    │ Authorized API      │
                    └─────────────────────┘

                               │
                         Scan Results
                               ▼
                    ┌─────────────────────┐
                    │      Outputs        │
                    │                     │
                    │ Dashboard           │
                    │ JSON Report         │
                    │ PDF Report          │
                    └─────────────────────┘
```
Technology Stack
Component	Technology
Frontend	React
Build Tool	Vite
Styling	Tailwind CSS
Icons	Lucide React
Backend	Node.js
API Server	Express.js
Scanner	Python
API Specification	OpenAPI / Swagger
Reports	JSON / PDF
Version Control	Git / GitHub
Installation
Requirements

Make sure the following are installed:

Node.js
Python 3
Git
1. Clone Repository
git clone https://github.com/tanishqueagrawal/SentinelAPI.git

cd SentinelAPI
2. Install Backend Dependencies
cd backend

npm install
3. Install Dashboard Dependencies
cd ../dashboard

npm install
4. Install Scanner Dependencies
cd ../scanner

pip install -r requirements.txt
Running SentinelAPI

SentinelAPI uses three main components:

Vulnerable API
      +
Backend
      +
Dashboard

Run each component in a separate terminal.

Terminal 1 — Vulnerable Sandbox API
cd vulnerable-api

npm install

node server.js

The controlled sandbox runs on:

http://localhost:5000
Terminal 2 — Backend
cd backend

node server.js

Backend:

http://localhost:4000
Terminal 3 — Dashboard
cd dashboard

npm run dev

Dashboard:

http://localhost:5173
Running the Scanner Directly

From the scanner directory:

python scanner.py

For the controlled sandbox:

python scanner.py --target http://localhost:5000 --mode active

Using a local OpenAPI specification:

python scanner.py --spec ../vulnerable-api/openapi.json

Passive scanning:

python scanner.py --target https://example.com --mode passive

Remote OpenAPI specification:

python scanner.py --spec-url <OPENAPI_URL> --mode passive
Scan Results

The scanner generates a structured JSON report containing:

Scan ID
Target
Scan timestamp
Scan mode
Security schemes
Total findings
Individual findings
Severity
Endpoint
Evidence
Remediation information

Example severity levels:

CRITICAL
HIGH
MEDIUM
LOW
INFO
Controlled Security Testing

SentinelAPI is designed to be used against:

Local sandbox APIs
Explicitly authorized APIs
APIs provided specifically for security testing
Public API specifications in passive mode

Do not use active scanning against systems without authorization.

Vulnerability Detection
BOLA / IDOR

The scanner checks whether object-level resources can potentially be accessed without appropriate authorization controls.

Example:

GET /users/{id}
GET /orders/{id}

The scanner records the relevant request/response evidence when a controlled test identifies the issue.

Excessive Data Exposure

The scanner looks for endpoints returning potentially sensitive fields or more information than expected.

Examples include:

passwordHash
salary
internalNotes
address
phone
Authentication Misconfiguration

The scanner can identify endpoints that appear to expose administrative or sensitive functionality without documented authentication requirements.

Passive Security Analysis

Passive analysis reviews the OpenAPI specification for security-related signals such as:

Missing security documentation
Sensitive operations
Object-level authorization requirements
Rate-limit documentation
Security schemes

Passive findings are treated as review signals rather than proof of runtime vulnerabilities.

Reports

SentinelAPI supports:

JSON

Structured results for integrations and automation.

PDF

Human-readable security assessment containing:

Target information
Scan information
Security score
Severity distribution
Findings
Evidence
Descriptions
Safety Model

SentinelAPI follows a controlled-testing approach.

The backend uses an allowlisted target configuration rather than acting as an unrestricted request proxy.

Active security testing is intended only for controlled or authorized targets.

Public API specifications can be analyzed using passive mode without sending active vulnerability-testing requests.

Future Improvements

Potential future development includes:

CI/CD integration
GitHub Actions support
More authorization test cases
JWT and API-key analysis
GraphQL security testing
Request replay
Improved rate-limit testing
Authentication-aware scanning
Historical security trends
Team/project management
Additional report formats
Project Status

SentinelAPI currently provides:

OpenAPI/Swagger ingestion
Endpoint discovery
Active and passive scanning
BOLA / IDOR detection
Data exposure detection
Authentication analysis
Evidence-based findings
React security dashboard
JSON reporting
PDF reporting
Controlled sandbox API
GitHub-based project distribution
License

This project is intended for educational, research, and authorized security testing purposes.


### 2. Save

`Ctrl + S`

### 3. GitHub pe push

Terminal:

```powershell
git add README.md
git commit -m "Add project documentation"
git push
