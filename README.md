# ConSeal: Intelligent PII Redaction Review Workbench

> An intelligent, human-in-the-loop PII redaction review and correction workbench.

---

## 🔍 Overview

Artificial Intelligence is highly effective at identifying pattern-based Personal Identifiable Information (PII) like emails or SSNs, but it remains fundamentally flawed when handling context-dependent information. Names, addresses, and custom identifiers in corporate communications frequently lead to false positives (redacting harmless text) and false negatives (failing to redact sensitive data).

Because missed PII poses severe legal, regulatory, and privacy risks, AI-generated redaction logs cannot be trusted blindly. **ConSeal** exists to bridge the gap. It is a human-in-the-loop workflow interface designed to help privacy compliance reviewers quickly audit, correct, and verify machine-generated redaction suggestions before documents are distributed.

---

## ⚠️ The Problem

AI-driven redaction pipelines suffer from three main operational weaknesses:
*   **False Positives**: AI models flag names of public organizations, dates, or non-sensitive numeric codes, making the output unreadable and stripping critical business context.
*   **False Negatives**: Subtle PII (like misspelled names, nickname variants, or contextual descriptors) is missed, exposing individuals to privacy violations and organization to massive compliance penalties (e.g., GDPR, HIPAA).
*   **Reviewer Fatigue**: Checking documents sentence-by-sentence is exhausting. When forced to review hundreds of individual suggestions using slow mouse-click interfaces, reviewers ("Sam") suffer from cognitive fatigue and eventually start letting errors slide through.

---

## 💡 Our Solution

ConSeal is built around a simple philosophy: **AI detects, but humans decide**. It optimizes the reviewer's cognitive load and speeds up verification through:
*   **Guided Review Workspace**: Directing attention immediately to unresolved High-Risk suggestions (e.g. SSNs, Bank Accounts) while keeping Low-Risk suggestions (e.g. Dates, Locations) accessible but non-intrusive.
*   **Attention Prioritization (Focus Mode)**: Dims all surrounding document text, isolating only the active suggestion to help the reviewer make decisions instantly without distraction.
*   **Decisions Propagation**: Automatically updates all repeating text occurrences in a document using word-boundary matching to eliminate repetitive tasks.
*   **Export Safety Gate**: Imposes a hard-stop safety checklist to ensure that no document can be exported while high-risk suggested spans remain unreviewed.

---

## 🚀 Key Features

### 🛠️ Intelligent Review Workflow
*   **What it does:** Organizes identified PII spans into a visual, color-coded hierarchy based on risk levels.
*   **Why it exists:** Reviewers need to triage. Putting unresolved high-risk items in red and low-risk in blue tells the reviewer exactly where to focus first.
*   **Solves:** Cognitive fatigue and random auditing.

### ⌨️ Keyboard Productivity
*   **What it does:** Provides instant keyboard hotkeys (`Arrow Keys` for navigation, `Enter` / `a` to Accept, `Backspace` / `r` to Reject, `Space` for Focus Mode).
*   **Why it exists:** Switching between keyboard and mouse slows down repetitive review tasks.
*   **Solves:** Review speed and ergonomic fatigue.

### 🔄 Entity Propagation
*   **What it does:** Prompts the reviewer when an entity repeats in the text, allowing them to apply their accept/reject decision to all occurrences with case-insensitive word-boundary matching.
*   **Why it exists:** If "John Smith" appears 12 times in a document, the reviewer should only have to decide once.
*   **Solves:** Redundant, repetitive review actions.

### 🛡️ Export Safety Checklist
*   **What it does:** Blocks output exports and displays a list of unresolved high-risk suggestions.
*   **Why it exists:** Provides an automated safety gate to prevent accidental data leaks due to missed reviews.
*   **Solves:** Compliance violations and human oversight errors.

### ♿ Accessibility (A11y)
*   **What it does:** Includes fully integrated screen-reader announcements (`aria-live="polite"`), clear keyboard focus outlines, and standard HTML tab flows.
*   **Why it exists:** Software should be accessible to all compliance officers, including those relying on screen readers or switch controls.
*   **Solves:** ADA/Section 508 compliance.

---

## 📸 Screenshots

### Document List
<!-- Screenshot Placeholder: document_list.png -->
*(Visual dashboard showing all files, their unreviewed span counts, and unresolved high-risk warnings.)*

### Document Review Workspace
<!-- Screenshot Placeholder: review_workspace.png -->
*(Split-pane interface containing the document reader, selected identifier details panel, and visual progress gauges.)*

### Focus Mode Active
<!-- Screenshot Placeholder: focus_mode.png -->
*(Context isolation view: surrounding text is dimmed, highlighting the active suggestion.)*

### Entity Propagation Prompt
<!-- Screenshot Placeholder: entity_propagation.png -->
*(Interactive prompt showing count of matching occurrences and keyboard actions to propagate.)*

### Export Safety Gate & Summary
<!-- Screenshot Placeholder: safety_gate.png -->
*(Summary panel showing the final checklists, resolving links for missed spans, and download options.)*

---

## 🏗️ Architecture

```
                 +-----------------------------------------+
                 |              User Browser               |
                 +-----------------------------------------+
                                      │
                                      ▼
                 +-----------------------------------------+
                 |            React Frontend               |
                 | (Components, ReviewScreen, DocumentList) |
                 +-----------------------------------------+
                                      │
                                      ▼
                 +-----------------------------------------+
                 |             Zustand Store               |
                 |       (Global State, Toast Queue)       |
                 +-----------------------------------------+
                                      │
                         HTTP REST    │   Optimistic Updates
                         Requests     ▼   & Sync Announcements
                 +-----------------------------------------+
                 |           Express API Server            |
                 +-----------------------------------------+
                                      │
                                      ▼
                 +-----------------------------------------+
                 |         In-Memory Data Service          |
                 |    (Bounds, Overlaps, Text Sync)        |
                 +-----------------------------------------+
```

### Layer Responsibilities
*   **React UI**: Stateless components that render the document text, trigger store actions, and handle keyboard events.
*   **Zustand Store**: The single source of truth for the application. Drives state, handles optimistic status transitions, manages the toast notifications queue, and calculates derived metadata dynamically.
*   **Express API Server**: Exposes RESTful endpoints, handles payload structure sanitization, and maps route handlers to backend services.
*   **Document Validation Service**: Validates proposed spans against text boundaries, checks coordinates, verifies actual text matches, and blocks overlapping redaction requests.

---

## 📁 Folder Structure

```
.
├── backend/
│   ├── src/
│   │   ├── __tests__/           # Express documentService validation unit tests
│   │   ├── data/                # Sample document fixtures
│   │   ├── middleware/          # Global error handler and payload sanitizers
│   │   ├── routes/              # Express endpoint routers
│   │   ├── services/            # In-memory database and coordination validator
│   │   └── app.ts               # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── __tests__/           # Vitest entity propagation & safety gate tests
│   │   ├── components/          # Reusable components (Badge, Highlights, Toast)
│   │   ├── pages/               # Primary screens (List, Review, Summary)
│   │   ├── services/            # API communication wrapper layer
│   │   ├── store/               # Zustand store config
│   │   ├── utils/               # Word-boundary matching utilities
│   │   ├── App.tsx              # Application layout router
│   │   └── index.css            # Tailwind entry and utility styling
│   ├── package.json
│   └── vite.config.ts
├── package.json                 # Project root scripts delegation
└── README.md
```

---

## 🛠️ Technology Stack

| Technology | Purpose | Reason for Selection |
| :--- | :--- | :--- |
| **React 19** | User Interface | Virtual DOM efficiency, component reusability, and clean declarative rendering. |
| **TypeScript** | Static Type Safety | Prevents runtime bugs, ensures clean interfaces between frontend models and backend payloads. |
| **Tailwind CSS v4** | Rapid Modern Styling | Used via `@tailwindcss/vite` to enforce consistent design tokens with zero custom CSS files. |
| **Zustand** | State Management | Ultra-lightweight alternative to Redux. Allows reactive global state with zero boilerplate. |
| **Node / Express** | API Backend | High-performance, asynchronous Javascript server perfect for lightweight REST services. |
| **Vitest** | Automated Testing | Blazing fast, Jest-compatible runner with native ESM support and zero-config TypeScript compilation. |

---

## 🎨 Product Design Decisions

### Keyboard-First Design
*   *Decision:* Bind hotkeys to every primary action.
*   *Tradeoff:* Reviewers require a brief learning curve. We added a visible `ShortcutHints` panel at the bottom of the sidebar to guide users and reduce friction.

### Word-Boundary Matching for Propagation
*   *Decision:* propagation matches entities strictly on alphanumeric word boundaries rather than simple substring matching.
*   *Tradeoff:* If the AI flags "John", propagation won't redact "Johnson". This minimizes accidental over-redaction, prioritizing data readability.

### Soft-Gate vs Hard-Gate Exports
*   *Decision:* Hard-block exports if High-Risk items are suggested, but allow low-risk items to pass unreviewed.
*   *Tradeoff:* Restricting low-risk items would annoy users with minor context. High-risk items must be resolved to protect privacy.

---

## ⚙️ Engineering Decisions

### Derived Store State
Instead of storing metrics (like `highRiskUnresolved` or `lowRiskUnresolved`) in the store's database, they are derived dynamically using React `useMemo` hooks. This eliminates synchronization bugs where state updates mismatch UI progress.

### Optimistic UI Synchronization
When a user updates a span's status, the frontend immediately reflects the state and moves focus forward. In the background, the HTTP request is fired. If it succeeds, the store updates its spans with backend IDs. If it fails, the store performs an automatic state rollback and displays an error toast notification.

---

## 🧪 Testing

### Frontend Tests
Run with `npm run test --prefix frontend`. Coverage includes:
*   `entity.test.ts`: Word-boundary regex verification, special characters, and lookaround assertion correctness.
*   `safetyGate.test.ts`: Asserts export safety gate blockers under various unresolved risk distributions.

### Backend Tests
Run with `npm run test --prefix backend`. Coverage includes:
*   `documentService.test.ts`: Validates status transitions, coordinate boundaries, actual string slice checks, and overlapping span exclusions.

---

## ♿ Accessibility (A11y)

ConSeal is fully accessible:
*   **Focus Visibility**: Clean high-contrast ring focus styling (`focus:ring-1 focus:ring-slate-500`) applied to all search controls, document cards, and review buttons.
*   **ARIA announcements**: An `aria-live="polite"` region reads status reports to screen readers when decisions are applied or propagated.
*   **Natural Focus Flows**: Standard HTML keyboard `Tab` flow is preserved. Reviewers can tab out of the editor screen seamlessly.

---

## ⚖️ Tradeoffs

1.  **In-Memory Store vs Database**:
    *   *Omitted:* A persistent SQL/NoSQL database layer.
    *   *Why:* To fit within the hackathon prototype time frame, in-memory Map stores were chosen. Database migrations would add configuration overhead without increasing core judging signal.
2.  **Mock PII Detection Engine**:
    *   *Omitted:* Real-time NLP model scanning.
    *   *Why:* Real NLP models require heavy compute resources. The application focus is the reviewer workflow, so pre-computed mock detection spans are served from fixtures.

---

## 🔮 Future Improvements

1.  **Persistent Storage**: Integrate PostgreSQL with Prisma ORM to save document sessions across server restarts.
2.  **Entity Auto-Highlighting**: Enable reviewers to manually highlight arbitrary text ranges in the editor and click "Add Custom Span" to register new entities.
3.  **Audit History & Rollback**: Maintain a historic ledger of who accepted/rejected each span, allowing infinite undo/redo states across review sessions.

---

## 📥 Installation

Ensure you have **Node.js v18+** installed.

```bash
# Clone the repository
git clone https://github.com/Konduru-Hemesh/hackathon_SprintFour.git
cd hackathon_SprintFour

# Install dependencies for backend and frontend
npm install --prefix backend
npm install --prefix frontend

# Start the services in development mode
# (Terminal 1 - Backend API at http://localhost:3001)
cd backend
npm run dev

# (Terminal 2 - Frontend Client at http://localhost:5173)
cd ../frontend
npm run dev
```

### Testing & Linting
```bash
# Run all unit tests
npm test

# Run code linter
npm run lint

# Compile production builds
npm run build
```

---

## 📋 Project Flow

```
   [ Document Index ] ──(Select Document)──> [ Review Editor ]
                                                    │
                                           (Accept/Reject Spans)
                                                    │
                                                    ▼
   [ Summary Screen ] <──(Finish Review)───── [ Propagation ]
          │
     (Safety Gate)
          │
          └───(All High-Risk Resolved?)───> [ Download Exports ]
```

---

## 🎮 Demo Instructions for Judges

To evaluate the application's robust feature set, perform the following steps:

1.  **Open Document B** (*Document B: Investigation Record*) from the list.
2.  Select the name **"John Smith"** (marked in Red as High-Risk).
3.  Press **`a`** (or click *Accept [A]*).
4.  **Observe the propagation prompt**: Select **[Enter] Apply to All**.
    *   *Verify:* All instances of "John Smith" across the document turn green, and a success toast confirmation pops up.
5.  Try to search for **"Doc C"** in the document index list search bar to verify the filtered list. Type a random string to observe the empty search state.
6.  Navigate to the **Summary Screen** by clicking **Finish Review**.
7.  **Observe the Safety Gate**: Since unresolved High-Risk items still exist, the download button is disabled.
8.  Click on any unresolved item in the checklist to jump back and resolve it. Once resolved, return and download your redacted files!

---

## 🌟 Why This Project Stands Out

*   **✔ Product Thinking**: Targets the core bottleneck of redaction pipelines—human review fatigue—rather than building a generic detection model.
*   **✔ Engineering Rigor**: Full backend coordinate, text verification, and overlap checks protect data integrity.
*   **✔ UX Polish**: Subtle saving indicators, clean keyboard workflows, and responsive visual design look and feel premium.
*   **✔ Accessibility Integrity**: Built from the ground up to respect screen readers and native keyboard navigation.
*   **✔ Pragmatic Tradeoffs**: Focuses dev hours on features that maximize value (propagation, safety gates) rather than databases.

---

## 📄 License

This project is licensed under the MIT License.
