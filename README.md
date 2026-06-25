# ⬡ Job Scout

An AI-powered job search agent that finds, scores, and tracks remote job opportunities — with one-click cover letter generation tailored to your resume.

**Live Demo:** [job-scout-jade.vercel.app](https://job-scout-jade.vercel.app)

---

## What It Does

Job Scout searches across multiple job boards in real time and returns structured, scored results based on your criteria. For each job it finds:

- Job title, company, location, and salary
- Match score (1–10) based on how well the role fits your criteria and resume
- Match reasoning — why it's a good or bad fit
- Role summary and skill tags
- Direct link to the job posting
- One-click tailored cover letter generation

### Job Tracking
Save any job and track it through your pipeline:
- **Saved → Applied → Interview → Offer → Rejected**
- Notes field per job for follow-up reminders
- Saved jobs persist across sessions
- Filter your saved jobs by status

### Resume Integration
Paste your resume once and it improves match scoring and personalizes every cover letter generated.

---

## Tech Stack

- **React** + **Vite** — frontend framework and build tool
- **Anthropic Claude API** (`claude-sonnet-4-6`) — job search, match scoring, and cover letter generation
- **Claude Web Search Tool** — live search across LinkedIn, Indeed, Glassdoor, ZipRecruiter, Wellfound, and Builtin
- **localStorage** — persistent job tracking across sessions
- **Vercel** — deployment and hosting

---

## Getting Started

### Prerequisites
- Node.js v18+
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Installation

```bash
git clone https://github.com/JLSmith91/job-scout.git
cd job-scout
npm install
```

### Environment Variables

Create a `.env` file in the root of the project:

```
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start searching.

---

## How to Use

1. **Set your criteria** — job title, minimum salary, location, keywords to include or exclude
2. **Add your resume** — click "+ Add Resume" in the header and paste your background
3. **Find Jobs** — the agent searches live job boards and returns up to 10 scored results
4. **Save jobs** you want to track
5. **Generate a cover letter** — one click creates a tailored cover letter for any job
6. **Track your pipeline** — update status as you apply and progress through interviews

---

## Deployment

This project is deployed on Vercel. To deploy your own instance:

1. Fork this repo
2. Import it into [vercel.com](https://vercel.com)
3. Add `VITE_ANTHROPIC_API_KEY` as an environment variable in Vercel project settings
4. Deploy

---

## Project Structure

```
job-scout/
├── src/
│   └── App.jsx        # Main application — search, save, track, cover letter logic
├── public/
├── index.html
├── vite.config.js
└── package.json
```

---

## Part of a Larger AI Tooling Portfolio

Job Scout is one of several AI-powered tools built for real-world personal and professional use. Other projects include a pre-market trading intelligence agent and an AI stock scanning system.

---

## Author

**Jared Smith** — [@JLSmith91](https://github.com/JLSmith91)
