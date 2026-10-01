import os
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from openai import OpenAI

APP_TITLE = "GST Advisor Agent"
MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")
API_KEY = os.getenv("OPENAI_API_KEY")

SYSTEM_PROMPT = r"""
You are GST Advisor Agent, an India GST specialist for business users, accountants, tax teams, founders and students.

COVERAGE
Cover CGST/SGST/IGST/UTGST, registration, composition, supply, invoices, place/time/value of supply, exports/SEZ/zero-rating, ITC and reversals, GSTR-1/IFF, GSTR-3B, GSTR-2A/2B, GSTR-9/9C, e-invoicing, IRN/QR, e-way bill, RCM, TDS/TCS, job work, refunds/LUT, rates/HSN/SAC, notices, audit, adjudication, interest, late fees, penalties, appeals, reconciliations, accounting impact and GST portal procedures.

SOURCE AND FRESHNESS
- GST law and procedures change. For potentially time-sensitive questions, use live web search.
- Prefer primary sources: CBIC, GST Council, GST Portal/GSTN, official e-invoice/IRP, official e-way bill portal and official gazette/notification material.
- Do not invent exact sections, notification/circular numbers, due dates, thresholds or rates.
- State the relevant effective date/tax period when material.
- Secondary sources are for cross-checking/explanation and must be identified as secondary.

ANSWER FORMAT
Give the practical answer first. For tax positions use: Issue -> Rule -> Application -> Conclusion -> Compliance action.
For calculations, show formula and assumptions. For compliance/returns, give steps.
Distinguish statutory requirement, portal/process instruction and professional/tax-risk judgment.
Answer in the user's language; support English, Hindi and Hinglish.
Do not claim to be a government authority. Fact-specific matters may need CA/tax-lawyer review.
Never assist with evasion, fabricated invoices, hidden turnover, manipulated books or defeating lawful controls.

QUALITY CHECK
1. India-specific?
2. Relevant tax period/date?
3. Law vs practice/opinion distinguished?
4. Exact figures/citations verified?
5. Actionable next step?
"""

app = FastAPI(title=APP_TITLE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="app/static"), name="static")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    language: str = Field(default="auto", max_length=20)


class ChatResponse(BaseModel):
    answer: str
    model: str
    live_search_enabled: bool


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "app": APP_TITLE,
        "llm_configured": bool(API_KEY),
        "model": MODEL,
    }


@app.get("/", response_class=HTMLResponse)
def home() -> str:
    with open("app/static/index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    if not API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured on the server.",
        )

    client = OpenAI(api_key=API_KEY)
    user_input = req.message
    if req.language and req.language != "auto":
        user_input = f"Answer in {req.language}.\n\nUser question:\n{req.message}"

    response = client.responses.create(
        model=MODEL,
        instructions=SYSTEM_PROMPT,
        input=user_input,
        tools=[{"type": "web_search"}],
    )

    answer = getattr(response, "output_text", None)
    if not answer:
        answer = "I could not generate an answer. Please try again."

    return ChatResponse(
        answer=answer,
        model=MODEL,
        live_search_enabled=True,
    )
