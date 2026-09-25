from email import parser
import sys
import json
import os
import argparse
import tempfile
import yaml
from datetime import datetime

import requests
from rich.console import Console
from rich.table import Table


# =========================================================
# WINDOWS / UTF-8 FIX
# =========================================================

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


# =========================================================
# CONFIGURATION
# =========================================================

console = Console()

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DEFAULT_OPENAPI_FILE = os.path.join(
    BASE_DIR,
    "..",
    "vulnerable-api",
    "openapi.json"
)

API_URL = "http://localhost:5000"
OPENAPI_FILE = DEFAULT_OPENAPI_FILE
SCAN_MODE = "active"


# =========================================================
# BANNER
# =========================================================

def banner():

    console.print(
        """
[bold cyan]
███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗
██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║
███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║
╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║
███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗
╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝
[/bold cyan]

[bold white]Zero-Trust API Vulnerability Scanner[/bold white]
"""
    )


# =========================================================
# LOAD OPENAPI
# =========================================================

def load_openapi():
    """
    Load OpenAPI specification from JSON or YAML.

    The parser automatically tries JSON first and YAML
    as a fallback, so remote specifications work even
    when the temporary file extension/content-type is
    not reliable.
    """

    console.print(
        "\n[cyan]Loading OpenAPI specification...[/cyan]"
    )

    if not os.path.exists(OPENAPI_FILE):

        console.print(
            f"[red]Specification file not found: "
            f"{OPENAPI_FILE}[/red]"
        )

        return None

    try:

        with open(
            OPENAPI_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            content = file.read()

        spec = None

        # ---------------------------------------------
        # Try JSON
        # ---------------------------------------------

        try:

            spec = json.loads(content)

        except json.JSONDecodeError:

            # -----------------------------------------
            # Fallback to YAML
            # -----------------------------------------

            try:

                spec = yaml.safe_load(content)

            except yaml.YAMLError as error:

                console.print(
                    f"[red]Could not parse OpenAPI "
                    f"specification: {error}[/red]"
                )

                return None

        if not isinstance(spec, dict):

            console.print(
                "[red]Invalid OpenAPI specification.[/red]"
            )

            return None

        # ---------------------------------------------
        # Validate basic OpenAPI / Swagger structure
        # ---------------------------------------------

        if (
            "openapi" not in spec
            and "swagger" not in spec
        ):

            console.print(
                "[yellow]Warning: specification does "
                "not contain an OpenAPI/Swagger version.[/yellow]"
            )

        console.print(
            "[green][+] OpenAPI specification loaded.[/green]"
        )

        return spec

    except OSError as error:

        console.print(
            f"[red]Could not read OpenAPI specification: "
            f"{error}[/red]"
        )

        return None

# =========================================================
# DISCOVER ENDPOINTS
# =========================================================

def discover_endpoints(spec):
    """
    Discover all HTTP endpoints from an OpenAPI
    or Swagger specification.

    Returns:
        [
            {
                "method": "GET",
                "path": "/users/{id}",
                "summary": "Get user",
                "security": [...]
            }
        ]
    """

    endpoints = []

    paths = spec.get("paths", {})

    if not isinstance(paths, dict):

        console.print(
            "[red]No valid paths found in specification.[/red]"
        )

        return endpoints

    supported_methods = {
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "head",
        "options"
    }

    for path, path_item in paths.items():

        if not isinstance(path_item, dict):
            continue

        for method, operation in path_item.items():

            method_lower = method.lower()

            if method_lower not in supported_methods:
                continue

            if not isinstance(operation, dict):
                operation = {}

            endpoint = {
                "method": method_lower.upper(),
                "path": path,
                "summary": operation.get(
                    "summary",
                    operation.get(
                        "description",
                        ""
                    )
                ),
                "security": operation.get(
                    "security",
                    spec.get("security", [])
                )
            }

            endpoints.append(endpoint)

    return endpoints


# =========================================================
# DISPLAY ENDPOINTS
# =========================================================

def show_endpoints(endpoints):

    table = Table(
        title="Discovered API Endpoints"
    )

    table.add_column(
        "Method",
        style="cyan",
        justify="center"
    )

    table.add_column(
        "Endpoint",
        style="white"
    )

    table.add_column(
        "Summary",
        style="green"
    )

    for endpoint in endpoints:

        method = endpoint.get(
            "method",
            "GET"
        )

        path = endpoint.get(
            "path",
            "/"
        )

        summary = endpoint.get(
            "summary",
            ""
        )

        table.add_row(
            method,
            path,
            summary[:70]
        )

    console.print(table)


# =========================================================
# CHECK TARGET API
# =========================================================

def check_api():

    console.print(
        "\n[bold yellow][*] Checking target API...[/bold yellow]"
    )

    try:

        response = requests.get(
            API_URL,
            timeout=5
        )

        if response.status_code == 200:

            console.print(
                "[bold green][+] Target API is reachable[/bold green]"
            )

            return True

    except requests.RequestException as error:

        console.print(
            f"[red]API connection error: {error}[/red]"
        )

    console.print(
        "[bold red][-] Target API is not reachable[/bold red]"
    )

    return False


# =========================================================
# BUILD TEST URL
# =========================================================

def build_test_url(path, test_id=101):

    url = path.replace(
        "{id}",
        str(test_id)
    )

    return API_URL + url


# =========================================================
# BOLA / IDOR SCANNER
# =========================================================

def scan_bola(endpoints):

    console.print(
        "\n[bold yellow][*] Running BOLA / IDOR detection...[/bold yellow]"
    )

    findings = []

    for endpoint in endpoints:

        if endpoint["method"] != "GET":
            continue

        path = endpoint["path"]

        # Current MVP tests {id} parameters.
        if "{id}" not in path:
            continue

        console.print(
            f"[cyan]Testing:[/cyan] GET {path}"
        )

        try:

            # ---------------------------------------------
            # Baseline request
            # ---------------------------------------------

            own_url = build_test_url(
                path,
                101
            )

            own_response = requests.get(
                own_url,
                timeout=5
            )

            if own_response.status_code != 200:
                continue

            # ---------------------------------------------
            # Cross-object request
            # ---------------------------------------------

            attack_url = build_test_url(
                path,
                102
            )

            attack_response = requests.get(
                attack_url,
                timeout=5
            )

            if attack_response.status_code == 200:

                findings.append(
                    {
                        "type": "Broken Object-Level Authorization",
                        "severity": "CRITICAL",
                        "endpoint": f"GET {path}",
                        "evidence": attack_url,
                        "expected": "403 Forbidden",
                        "actual": "200 OK",
                        "description": (
                            "The API returned another object's data "
                            "without enforcing object-level authorization."
                        ),
                        "recommendation": (
                            "Verify that the authenticated user owns "
                            "the requested resource before returning it."
                        )
                    }
                )

                console.print(
                    "[bold red]  [!] Possible BOLA detected[/bold red]"
                )

        except requests.RequestException as error:

            console.print(
                f"[red]  Error: {error}[/red]"
            )

    return findings


# =========================================================
# EXCESSIVE DATA EXPOSURE
# =========================================================

def scan_data_exposure(endpoints):

    console.print(
        "\n[bold yellow][*] Checking for excessive data exposure...[/bold yellow]"
    )

    findings = []

    sensitive_fields = [
        "password",
        "passwordHash",
        "token",
        "secret",
        "salary",
        "internalNotes",
        "phone",
        "address"
    ]

    for endpoint in endpoints:

        if endpoint["method"] != "GET":
            continue

        path = endpoint["path"]

        # Skip dynamic paths for this MVP check.
        if "{" in path:
            continue

        url = API_URL + path

        try:

            response = requests.get(
                url,
                timeout=5
            )

            if response.status_code != 200:
                continue

            try:

                data = response.json()

            except ValueError:

                continue

            exposed = []

            if isinstance(data, dict):

                for field in sensitive_fields:

                    if field in data:

                        exposed.append(field)

            if exposed:

                findings.append(
                    {
                        "type": "Excessive Data Exposure",
                        "severity": "HIGH",
                        "endpoint": f"GET {path}",
                        "evidence": ", ".join(exposed),
                        "expected": "Only necessary fields",
                        "actual": (
                            f"{len(exposed)} sensitive fields exposed"
                        ),
                        "description": (
                            "The API response contains sensitive "
                            "fields that may not be required by the client."
                        ),
                        "recommendation": (
                            "Return only the fields required by the "
                            "client application."
                        )
                    }
                )

                console.print(
                    "[bold red]"
                    f"  [!] Sensitive fields: {', '.join(exposed)}"
                    "[/bold red]"
                )

        except requests.RequestException as error:

            console.print(
                f"[red]  Error: {error}[/red]"
            )

    return findings


# =========================================================
# AUTHENTICATION CHECK
# =========================================================

def scan_authentication(endpoints):

    console.print(
        "\n[bold yellow][*] Checking authentication configuration...[/bold yellow]"
    )

    findings = []

    for endpoint in endpoints:

        path = endpoint["path"]

        # Current MVP checks admin endpoints.
        if not path.startswith("/admin"):
            continue

        if endpoint["method"] != "GET":
            continue

        try:

            response = requests.get(
                API_URL + path,
                timeout=5
            )

            if response.status_code == 200:

                findings.append(
                    {
                        "type": "Authentication Misconfiguration",
                        "severity": "HIGH",
                        "endpoint": f"GET {path}",
                        "evidence": (
                            "Admin endpoint accessible without authentication"
                        ),
                        "expected": "401 / 403",
                        "actual": "200 OK",
                        "description": (
                            "An administrative endpoint returned data "
                            "without enforcing authentication."
                        ),
                        "recommendation": (
                            "Require authentication and role-based "
                            "authorization for administrative endpoints."
                        )
                    }
                )

                console.print(
                    "[bold red]  [!] Unauthenticated admin endpoint[/bold red]"
                )

        except requests.RequestException as error:

            console.print(
                f"[red]  Error: {error}[/red]"
            )

    return findings


# =========================================================
# SAVE JSON REPORT
# =========================================================

def save_report(findings, security_schemes=None):

    scanner_folder = os.path.dirname(
        os.path.abspath(__file__)
    )

    report_path = os.path.join(
        scanner_folder,
        "scan-report.json"
    )

    if security_schemes is None:
        security_schemes = []

    report = {
        "scan_id": (
            f"SCAN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        ),
        "target": API_URL,
        "mode": SCAN_MODE,
        "timestamp": datetime.now().isoformat(),
        "total_findings": len(findings),

        "security_schemes": security_schemes,

        "findings": findings
    }

    try:

        with open(
            report_path,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                report,
                file,
                indent=2
            )

        console.print(
            "\n[bold green]"
            f"[+] Report saved: {report_path}"
            "[/bold green]"
        )

        return report_path

    except OSError as error:

        console.print(
            f"[bold red][-] Could not save report: {error}[/bold red]"
        )

        return None
    
# =========================================================
# DISPLAY RESULTS
# =========================================================

def show_results(findings):

    console.print("\n")

    if not findings:

        console.print(
            "[bold green][OK] No vulnerabilities detected[/bold green]"
        )

        return

    table = Table(
        title="SentinelAPI Security Findings",
        show_lines=True
    )

    table.add_column("Severity")
    table.add_column("Vulnerability")
    table.add_column("Endpoint")
    table.add_column("Evidence")

    for finding in findings:

        severity = finding["severity"]

        if severity == "CRITICAL":

            severity_text = "[bold red]CRITICAL[/bold red]"

        elif severity == "HIGH":

            severity_text = "[bold yellow]HIGH[/bold yellow]"

        elif severity == "MEDIUM":

            severity_text = "[bold orange1]MEDIUM[/bold orange1]"

        else:

            severity_text = severity

        table.add_row(
            severity_text,
            finding["type"],
            finding["endpoint"],
            finding["evidence"]
        )

    console.print(table)
    
def download_openapi_spec(spec_url):
    """
    Download a remote OpenAPI JSON/YAML specification
    and save it temporarily for the scanner.
    """

    console.print(
        "[cyan]Loading remote OpenAPI specification...[/cyan]"
    )

    try:

        response = requests.get(
            spec_url,
            timeout=15
        )

        response.raise_for_status()

        content_type = response.headers.get(
            "content-type",
            ""
        ).lower()

        extension = ".json"

        if (
            "yaml" in content_type
            or "yml" in spec_url.lower()
        ):
            extension = ".yaml"

        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
            mode="wb"
        )

        temp_file.write(
            response.content
        )

        temp_file.close()

        console.print(
            "[green]OpenAPI specification loaded.[/green]"
        )

        return temp_file.name

    except requests.RequestException as error:

        console.print(
            f"[red]Could not load OpenAPI specification: {error}[/red]"
        )

        raise SystemExit(1)
    
def main():

    global API_URL
    global OPENAPI_FILE
    global SCAN_MODE

    parser = argparse.ArgumentParser(
        description="SentinelAPI Zero-Trust API Vulnerability Scanner"
    )

    parser.add_argument(
        "--target",
        default="http://localhost:5000",
        help="Target API base URL"
    )

    parser.add_argument(
        "--mode",
        choices=["active", "passive"],
        default="active",
        help="Security scanning mode"
    )

    parser.add_argument(
        "--spec",
        default=DEFAULT_OPENAPI_FILE,
        help="Local OpenAPI specification file"
    )

    parser.add_argument(
        "--spec-url",
        default="",
        help="Remote OpenAPI specification URL"
    )

    args = parser.parse_args()

    if args.spec_url:
        OPENAPI_FILE = download_openapi_spec(
            args.spec_url
        )
    else:
        OPENAPI_FILE = args.spec

    API_URL = args.target.rstrip("/")
    SCAN_MODE = args.mode

    console.print(
        f"[cyan]Target:[/cyan] {API_URL}"
    )

    console.print(
        f"[cyan]Mode:[/cyan] {SCAN_MODE.upper()}"
    )

    banner()

    # ---------------------------------------------
    # 1. Load OpenAPI
    # ---------------------------------------------

    spec = load_openapi()

    if not spec:
        return
    
    security_schemes = extract_security_schemes(
    spec
    )

    # ---------------------------------------------
    # 2. Discover endpoints
    # ---------------------------------------------

    endpoints = discover_endpoints(spec)

    if not endpoints:

        console.print(
            "[bold red][-] No endpoints found[/bold red]"
        )

        return

    # ---------------------------------------------
    # 3. Display API surface
    # ---------------------------------------------

    show_endpoints(endpoints)

    # ---------------------------------------------
# 4. Check target API
# ---------------------------------------------

    if SCAN_MODE == "active":

        if not check_api():
            return

    else:

        console.print(
            "[cyan]Passive mode: skipping active API health check.[/cyan]"
        )

    # ---------------------------------------------
    # 5. Run security scans
    # ---------------------------------------------

    findings = []

    if SCAN_MODE == "active":

     console.print(
         "\n[cyan]Running active security tests...[/cyan]"
     )

     findings.extend(
         scan_bola(endpoints)
     )

     findings.extend(
         scan_data_exposure(endpoints)
     )

     findings.extend(
         scan_authentication(endpoints)
     )

    else:

     console.print(
         "\n[cyan]Running passive API analysis...[/cyan]"
     )

     findings.extend(
    passive_analysis(
        endpoints,
        spec
    )
)
    
    # ---------------------------------------------
    # 6. Save JSON report
    # ---------------------------------------------

    save_report(
    findings,
    security_schemes
    )
    # ---------------------------------------------
    # 7. Display findings
    # ---------------------------------------------

    show_results(findings)
    
def extract_security_schemes(spec):
    """
    Extract authentication/security schemes from OpenAPI.
    """

    components = spec.get(
        "components",
        {}
    )

    schemes = components.get(
        "securitySchemes",
        {}
    )

    # Swagger 2.x compatibility
    if not schemes:
        schemes = spec.get(
            "securityDefinitions",
            {}
        )

    result = []

    for name, config in schemes.items():

        if not isinstance(config, dict):
            continue

        result.append({
            "name": name,
            "type": config.get(
                "type",
                "unknown"
            ),
            "scheme": config.get(
                "scheme",
                ""
            ),
            "in": config.get(
                "in",
                ""
            ),
            "description": config.get(
                "description",
                ""
            )
        })

    return result

# ============================================================
# PASSIVE ANALYSIS
# ============================================================

def passive_analysis(endpoints, spec):
    """
    Passive security analysis.

    No active requests or exploitation are performed.
    Findings are based only on the OpenAPI specification.
    """

    findings = []

    global_security = spec.get(
        "security",
        []
    )

    paths = spec.get(
        "paths",
        {}
    )

    # -------------------------------------------------
    # Helper
    # -------------------------------------------------

    def has_security(endpoint):

        security = endpoint.get(
            "security",
            None
        )

        # Explicit security: []
        # means authentication is intentionally not required.
        if security == []:
            return False

        # Operation has its own security definition.
        if security:
            return True

        # Fall back to global API security.
        if global_security:
            return True

        return False

    # -------------------------------------------------
    # Analyze endpoints
    # -------------------------------------------------

    for endpoint in endpoints:

        method = endpoint.get(
            "method",
            "GET"
        ).upper()

        path = endpoint.get(
            "path",
            "/"
        )

        operation = (
            paths
            .get(path, {})
            .get(method.lower(), {})
        )

        security_present = has_security(
            endpoint
        )

        # ---------------------------------------------
        # 1. Authentication documentation
        # ---------------------------------------------

        if not security_present:

            findings.append({
                "id": f"PASSIVE-AUTH-{len(findings) + 1}",
                "type": "Authentication Documentation",
                "severity": "LOW",
                "endpoint": f"{method} {path}",
                "evidence": (
                    "No security requirement is documented "
                    "for this operation."
                ),
                "expected": (
                    "Protected operations should explicitly "
                    "document their authentication requirement."
                ),
                "actual": (
                    "No authentication requirement was found "
                    "in the OpenAPI security definition."
                ),
                "description": (
                    "The OpenAPI specification does not document "
                    "an authentication requirement for this endpoint. "
                    "This does not prove the endpoint is vulnerable."
                ),
                "recommendation": (
                    "If this endpoint requires authentication, "
                    "add the appropriate OpenAPI security requirement "
                    "and enforce authentication on the server."
                )
            })

        # ---------------------------------------------
        # 2. Sensitive operation review
        # ---------------------------------------------

        if method in {
            "POST",
            "PUT",
            "PATCH",
            "DELETE"
        } and not security_present:

            findings.append({
                "id": f"PASSIVE-PRIV-{len(findings) + 1}",
                "type": "Sensitive Operation Review",
                "severity": "MEDIUM",
                "endpoint": f"{method} {path}",
                "evidence": (
                    f"{method} operation has no documented "
                    "security requirement."
                ),
                "expected": (
                    "State-changing operations should document "
                    "their required authentication/authorization."
                ),
                "actual": (
                    "No security requirement was documented "
                    "for this state-changing operation."
                ),
                "description": (
                    "State-changing API operations deserve an "
                    "explicit authentication and authorization review. "
                    "This passive finding does not prove unauthorized access."
                ),
                "recommendation": (
                    "Require authentication and enforce server-side "
                    "authorization for this operation. Document the "
                    "required security scheme in OpenAPI."
                )
            })

        # ---------------------------------------------
        # 3. Object-level authorization review
        # ---------------------------------------------

        if (
            "{" in path
            and "}" in path
            and method in {
                "GET",
                "PUT",
                "PATCH",
                "DELETE"
            }
            and not security_present
        ):

            findings.append({
                "id": f"PASSIVE-BOLA-{len(findings) + 1}",
                "type": "Object-Level Authorization Review",
                "severity": "MEDIUM",
                "endpoint": f"{method} {path}",
                "evidence": (
                    "Object identifier is present in the path "
                    "without a documented security requirement."
                ),
                "expected": (
                    "Object-level endpoints should enforce "
                    "authenticated ownership/authorization checks."
                ),
                "actual": (
                    "The specification does not document "
                    "a security requirement."
                ),
                "description": (
                    "An identifier-based endpoint was found without "
                    "documented security requirements. This is a review "
                    "signal, not proof of BOLA/IDOR."
                ),
                "recommendation": (
                    "Enforce server-side object-level authorization "
                    "for every requested resource. Verify that the "
                    "authenticated user is allowed to access or modify "
                    "the referenced object."
                )
            })

        # ---------------------------------------------
        # 4. Rate-limit documentation
        # ---------------------------------------------

        operation_text = " ".join([
            str(operation.get("summary", "")),
            str(operation.get("description", ""))
        ]).lower()

        rate_limit_documented = any(
            keyword in operation_text
            for keyword in [
                "rate limit",
                "rate-limit",
                "ratelimit",
                "throttl"
            ]
        )

        if not rate_limit_documented:

            findings.append({
                "id": f"PASSIVE-RATE-{len(findings) + 1}",
                "type": "Rate-Limit Documentation",
                "severity": "INFO",
                "endpoint": f"{method} {path}",
                "evidence": (
                    "No rate-limit or throttling information "
                    "was found in the operation documentation."
                ),
                "expected": (
                    "Public or sensitive APIs should document "
                    "applicable throttling expectations."
                ),
                "actual": (
                    "No rate-limit documentation was detected."
                ),
                "description": (
                    "The OpenAPI specification does not describe "
                    "rate limiting for this endpoint. This does not "
                    "prove that rate limiting is absent at runtime."
                ),
                "recommendation": (
                    "Define appropriate rate limits at the API gateway "
                    "or service layer and document the policy for clients."
                )
            })

    return findings


# ============================================================
# PROGRAM ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()