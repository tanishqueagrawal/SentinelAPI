require("dotenv").config();
const Groq = require("groq-sdk");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const PORT = 4000;

app.use(cors());
app.use(express.json());

const scannerDir = path.join(__dirname, "..", "scanner");
const scannerFile = path.join(scannerDir, "scanner.py");
const reportFile = path.join(scannerDir, "scan-report.json");

/*
|--------------------------------------------------------------------------
| Allowed Targets
|--------------------------------------------------------------------------
| We intentionally whitelist targets instead of accepting arbitrary URLs.
| This prevents the scanner backend from becoming an SSRF/attack proxy.
|--------------------------------------------------------------------------
*/

const TARGETS = {
    sandbox: {
        name: "SentinelAPI Sandbox",
        url: "http://localhost:5000",
        mode: "active",
        spec: "local"
    },

    petstore: {
        name: "Swagger Petstore",
        url: "https://petstore3.swagger.io/api/v3",
        mode: "passive",
        specUrl: "https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml"
    },

    jsonplaceholder: {
        name: "JSONPlaceholder",
        url: "https://jsonplaceholder.typicode.com",
        mode: "passive",
        spec: "builtin-jsonplaceholder"
    }
};


/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "SentinelAPI Backend",
        scanner: "online"
    });
});


/*
|--------------------------------------------------------------------------
| Available Targets
|--------------------------------------------------------------------------
*/

app.get("/api/targets", (req, res) => {
    res.json({
        success: true,
        targets: Object.entries(TARGETS).map(
            ([id, target]) => ({
                id,
                ...target
            })
        )
    });
});


/*
|--------------------------------------------------------------------------
| Run Scan
|--------------------------------------------------------------------------
*/

app.post("/api/scan", (req, res) => {
    app.post("/api/ai-analysis", async(req, res) => {
        try {
            const { finding } = req.body;

            if (!finding) {
                return res.status(400).json({
                    success: false,
                    error: "Finding data is required"
                });
            }

            if (!process.env.GROQ_API_KEY) {
                return res.status(500).json({
                    success: false,
                    error: "GROQ_API_KEY is not configured"
                });
            }

            const prompt = `
You are an API security analyst assisting SentinelAPI.

Analyze ONLY the evidence provided below.
Do not invent vulnerabilities, evidence, requests, responses, CVEs,
or facts that are not present.

Return practical developer-facing security guidance.

Finding:
${JSON.stringify(finding, null, 2)}

Return JSON with exactly these fields:
{
  "summary": "...",
  "impact": "...",
  "root_cause": "...",
  "remediation": "...",
  "developer_actions": ["...", "...", "..."],
  "verification": ["...", "..."]
}
`;

            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                temperature: 0.2,
                response_format: {
                    type: "json_object"
                },
                messages: [{
                        role: "system",
                        content: "You are a precise API security remediation assistant."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

            const content =
                completion.choices[0].message.content;

            if (!content) {
                throw new Error("Empty LLM response");
            }

            const analysis = JSON.parse(content);

            res.json({
                success: true,
                analysis
            });

        } catch (error) {
            console.error("AI analysis error:", error);

            res.status(500).json({
                success: false,
                error: error.message ||
                    "AI security analysis failed"
            });
        }
    });

    const targetId = req.body ? req.body.targetId : "sandbox";

    const target = TARGETS[targetId];

    if (!target) {
        return res.status(400).json({
            success: false,
            error: "Unknown target"
        });
    }

    console.log("\n====================================");
    console.log("SentinelAPI Scan");
    console.log("Target:", target.name);
    console.log("URL:", target.url);
    console.log("Mode:", target.mode);
    console.log("====================================\n");


    /*
     * Remove previous report.
     */

    try {
        if (fs.existsSync(reportFile)) {
            fs.unlinkSync(reportFile);
        }
    } catch (error) {
        console.error(
            "Could not remove previous report:",
            error.message
        );
    }


    /*
     * Start Python scanner.
     *
     * IMPORTANT:
     * The Python scanner must understand:
     *
     * --target
     * --mode
     */

    const scannerArgs = [
        "-u",
        scannerFile,
        "--target",
        target.url,
        "--mode",
        target.mode
    ];

    if (target.specUrl) {
        scannerArgs.push(
            "--spec-url",
            target.specUrl
        );
    }

    if (target.spec === "builtin-jsonplaceholder") {
        scannerArgs.push(
            "--spec",
            path.join(
                scannerDir,
                "public-specs",
                "jsonplaceholder.json"
            )
        );
    }

    const python = spawn(
        "py",
        scannerArgs, {
            cwd: scannerDir,
            windowsHide: true
        }
    );


    let stdout = "";
    let stderr = "";


    python.stdout.on("data", (data) => {

        const text = data.toString();

        stdout += text;

        console.log(
            "[SCANNER]",
            text.trim()
        );

    });


    python.stderr.on("data", (data) => {

        const text = data.toString();

        stderr += text;

        console.error(
            "[SCANNER ERROR]",
            text.trim()
        );

    });


    python.on("error", (error) => {

        console.error(
            "Failed to start scanner:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Could not start Python scanner"
        });

    });


    python.on("close", (code) => {

        console.log(
            "Scanner exited with code:",
            code
        );


        if (code !== 0) {

            return res.status(500).json({
                success: false,
                error: stderr ||
                    "Scanner exited with an error",
                output: stdout
            });

        }


        /*
         * Read generated report.
         */

        if (!fs.existsSync(reportFile)) {

            return res.status(500).json({
                success: false,
                error: "scan-report.json was not generated",
                output: stdout
            });

        }


        try {

            const reportRaw = fs.readFileSync(
                reportFile,
                "utf8"
            );

            const report = JSON.parse(reportRaw);


            /*
             * Add target metadata.
             */

            report.target = {
                id: targetId,
                name: target.name,
                url: target.url,
                mode: target.mode
            };


            return res.json({
                success: true,
                target,
                report
            });

        } catch (error) {

            console.error(
                "Could not read report:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Invalid scanner report"
            });

        }

    });

});


/*
|--------------------------------------------------------------------------
| Last Report
|--------------------------------------------------------------------------
*/

app.get("/api/report", (req, res) => {

    if (!fs.existsSync(reportFile)) {

        return res.json({
            success: true,
            report: null
        });

    }


    try {

        const report = JSON.parse(
            fs.readFileSync(
                reportFile,
                "utf8"
            )
        );

        res.json({
            success: true,
            report
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: "Could not read report"
        });

    }

});


/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

n(PORT, () => {

    console.log(
        `SentinelAPI backend running on http://localhost:${PORT}`
    );

});