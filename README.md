# PasteGuard 0.2.1 — free experimental preview


Local pattern redaction with an ON/OFF switch for selected text inputs on ChatGPT, Claude, and Gemini. Starts OFF. Turning OFF leaves new text unchanged and does not restore removed text.


**[Download the free ZIP](https://api.github.com/repos/edricyan2022-wq/pasteguard-preview/zipball/v0.2.1)** · [Release details](https://github.com/edricyan2022-wq/pasteguard-preview/releases/tag/v0.2.1)


No account or payment is required to use the extension. No paid team service is available. This is not a Chrome Web Store release.


## Planned team offer and optional sharing

[Join the public team waitlist](https://github.com/edricyan2022-wq/pasteguard-preview/issues/new?template=team-waitlist.yml) · [Copy a teammate invite](TEAM-INTEREST.md#share-voluntarily-with-a-teammate)

The proposed team price is $500/month. Shared rules, accounts, and team controls are not implemented. Payments are off. Joining records interest, not a purchase. GitHub sign-in is required for the public form; do not include work email, company identity, or private data. Sharing is voluntary and does not unlock capacity.

## Install


1. Download and extract the ZIP.
2. Open chrome://extensions in Chrome. Enable Developer mode.
3. Choose Load unpacked and select the **extension** folder inside the extracted project, containing manifest.json.
4. Reload a supported AI tab. Open the PasteGuard popup and switch ON.
5. Test using fake examples such as demo@example.com and password=FAKE_SECRET_123. Switch OFF and confirm new input stays unchanged. Follow your company installation policy.


## Verification and limits


All eight public extension files match the tested source apart from blank lines and line endings. The downloaded release passed all 25 scanner/package checks. Run node tests/detector.cjs from the extracted project to repeat them. Previous browser testing used 12 interactions and 6 synthetic event cases with mock Chrome storage.


**Installed Chrome and live ChatGPT/Claude/Gemini editor compatibility remain unverified.** This checks selected credential and personal-information patterns, can miss secrets or flag harmless text, and can flatten rich-text formatting. It does not protect every app or all confidential code. A destination may read text before a pattern is recognized. No guaranteed response time or complete leak prevention.


## Voluntary feedback


Use the repository Issues tab to report installation success, repeat use, false alarms, or editor failures. The feedback form is optional. Issues are public: fabricated examples only, never real credentials, private code, customer prompts, or personal information.


## Privacy


Scanning is local. No outbound scanning requests, AI API, analytics, or saved snippets. Only the ON/OFF preference is stored. Other sites, extensions, and clipboard history remain outside its control. Read [PRIVACY.md](PRIVACY.md).




