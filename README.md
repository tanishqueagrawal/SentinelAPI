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
