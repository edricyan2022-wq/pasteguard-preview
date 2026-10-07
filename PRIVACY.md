# Privacy � experimental v0.3.0

Rules run locally in Chrome. Optional local AI sends text from supported editable fields through the extension worker only to http://127.0.0.1:4322/scan on the same computer. Both protection and AI switches must be ON. Text is processed in memory and no snippets, analytics, or request logs are saved. ON/OFF, AI preference and guessing preference are saved in Chrome extension local storage.

The optional server binds only to loopback; it has no cloud inference calls. Setup obtains Python packages from PyPI and model files from Hugging Face, disclosing ordinary download metadata to those services. It does not send user snippets during setup.

The localhost host permission is new. The background worker restricts requests to one fixed endpoint and supported sender origins. The model is a token classifier, not a guarantee of confidentiality. A destination may observe text before it is detected. Files, images, rich editors, unsupported sites, password fields and desktop apps are not covered. No company billing, account system or payment provider exists.

Public GitHub feedback and interest forms are visible to others; use fake data only.

