# 🤖 OpenClaw

OpenClaw is a personal CLI and Telegram-based AI coding assistant. It integrates directly with your codebase, allowing you to ask questions, run plans, check and reply to emails, and execute complex agent tasks with staging, interactive, or step-by-step approvals.

---

# Features

# 1. Agent Mode
An agent runs inside your codebase, uses custom tools to read/create/modify/delete files, and runs shell commands. You can choose from three execution modes:
- **Standard Run**: Staged changes are reviewed and applied together at the end.
- **Interactive Chat Mode**: A back-and-forth conversational session (`/exit` to quit) that maintains message history and reviews changes after each turn.
- **Step-by-Step Approval Mode**: Same as standard, but prompts you to approve/reject every staging action in real-time as it occurs.

### 2.  Plan Mode
Generates a multi-step plan for a goal and executes the plan step-by-step upon your approval.

### 3. 🔍 Ask Mode
Answers questions about the codebase using codebase search, file analysis, or external web research (via Firecrawl).

### 4. 📬 Email Integration
The agent has tools to access and interact with emails:
- `email_list_unread`: Lists recent unread emails.
- `email_read_body`: Reads the full body of a specific email.
- `email_send_or_reply`: Sends or replies to threads (preserves message-threading headers).

### 5. 💬 Telegram Bot Mode
Run the assistant as a Telegram bot. The bot authorizes you as the owner and notifies you or executes commands remotely.

---

## 🛠️ Setup & Configuration

1. **Install Dependencies**:
   ```bash
   bun install
   ```

2. **Environment Variables (`.env`)**:
   Create a `.env` file in the root of the project with the following properties:
   ```env
   # LLM API
   OPENROUTER_API_KEY = your-openrouter-key
   OPENROUTER_DEFAULT_MODEL = 'openrouter/free'
   
   # Web Research
   FIRECRAWL_API_KEY = your-firecrawl-key
   
   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN = your-telegram-bot-token
   TELEGRAM_OWNER_ID = your-telegram-user-id
   
   # Email Service Configuration (Optional)
   EMAIL_USER = your-email@gmail.com
   EMAIL_PASSWORD = your-app-password
   EMAIL_IMAP_HOST = imap.gmail.com
   EMAIL_IMAP_PORT = 993
   EMAIL_SMTP_HOST = smtp.gmail.com
   EMAIL_SMTP_PORT = 465
   ```

   > [!TIP]
   > If you do not know your `TELEGRAM_OWNER_ID`, launch the Telegram bot, send any message to it, and look at the console logs. It will print your Chat ID and a hint on how to add it to `.env`.

---

## 🏃 How to Run

### Command Line Interface (CLI)

To launch the CLI interactive menu:
```bash
bun run index.ts wakeup
```
This shows a banner and lets you proceed with CLI Mode or Telegram Mode.

Or run specific commands directly:
```bash
# Start directly in wakeup mode
bun run index.ts wakeup
```

---

## 📁 Codebase Structure

- [index.ts](file:///c:/Users/arush/openclaw/index.ts): Main CLI entry point using Commander.js.
- [ai/](file:///c:/Users/arush/openclaw/ai/): Configuration of AI models (OpenRouter provider).
- [tui/](file:///c:/Users/arush/openclaw/tui/): Text user interface helpers (banners, Markdown styling).
- [modes/](file:///c:/Users/arush/openclaw/modes/):
  - [cli.ts](file:///c:/Users/arush/openclaw/modes/cli.ts): Handles CLI sub-modes (Agent, Plan, Ask).
  - [agent/](file:///c:/Users/arush/openclaw/modes/agent/): Contains agent loop, tools, action tracking, step-by-step confirmation, and email tools.
  - [telegram/](file:///c:/Users/arush/openclaw/modes/telegram/): Contains Telegram bot orchestration and interactive approval keyboard handlers.
