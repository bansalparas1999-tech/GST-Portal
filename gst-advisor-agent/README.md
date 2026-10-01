# GST Advisor Agent — India

Railway-ready FastAPI GST advisory chatbot. It uses an OpenAI Responses API model with live web search and a GST-specific instruction layer covering Indian GST law, compliance, returns, ITC, e-invoicing, e-way bill, rates, refunds, notices and reconciliation.

## Railway variables
- `OPENAI_API_KEY` — required
- `OPENAI_MODEL` — defaults to `gpt-5.6-luna`

## Local run
```bash
pip install -r requirements.txt
set OPENAI_API_KEY=your_key_here
uvicorn app.main:app --reload
```

## Service
The Dockerfile starts FastAPI on Railway's `PORT` and exposes:
- `GET /health`
- `GET /`
- `POST /api/chat`

The agent is informational, not a government authority. For live tax positions, the prompt directs the model to prefer official CBIC, GST Council, GST Portal/GSTN, e-invoice, e-way bill and gazette sources.
