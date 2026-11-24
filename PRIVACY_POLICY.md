# Privacy Policy

**Last Updated:** November 2026  
**App:** Aura LLM

Aura LLM is built as an **offline-first, on-device AI assistant**. Your privacy is a core architectural guarantee, not an afterthought.

## 1. On-Device Processing
All AI inference—including your chat prompts, AI responses, attached images/documents, and voice transcriptions—runs locally on your device. Aura LLM does not send your conversations to our servers.

## 2. Local Data Storage
Your display name, app preferences, chat history, and downloaded model files are stored strictly in local storage on your device. Uninstalling the app or deleting models removes this data from your device.

## 3. Zero Telemetry & Tracking
Aura LLM collects **zero** personal data, analytics, crash telemetry, advertising identifiers, or usage metrics. There are no user accounts, no cloud sync, and no third-party ad or tracking SDKs.

## 4. User-Initiated Network Activity
Aura LLM only uses the internet when you explicitly trigger a network feature:
- **Model Downloads:** When you browse or download open-weight models from third-party repositories (such as Hugging Face or configured mirrors), your device connects directly to those hosts to fetch model metadata and files.
- **Optional Web Search:** Web Search is **off by default**. If you explicitly toggle Web Search on in Settings, search queries will be sent externally to retrieve web results. When off, Aura LLM operates completely offline.

## 5. Device Permissions
Permissions are requested only when needed for local features:
- **Microphone:** Used solely for on-device voice transcription.
- **Camera / Photos:** Used solely to pass selected images to your local vision model.
- **Notifications:** Used solely for local model download progress and completion alerts.

## 6. Contact
If you have questions about this Privacy Policy, please open an issue at [github.com/mira4sol/aura-llm](https://github.com/mira4sol/aura-llm).
