# SmartFix — User Guide

A short guide for shop-floor technicians using SmartFix to troubleshoot machines.

---

## What is SmartFix?

SmartFix is a chat assistant that answers your machine questions using the **official manual** for the machine you are working on. It does not guess. Every answer points back to a page in the manual.

You ask a question → SmartFix reads the manual → you get a step-by-step answer with a page reference.

---

## How to sign in

1. Open SmartFix in your browser (your supervisor will give you the link).
2. You will see a **worker sign-in** screen.
3. Enter your name (or worker ID) and click **Start**.
4. SmartFix recognises the workstation by its network address, so it already knows which machine is in front of you.

That is the only step. No password.

---

## Asking a question — the basics

In the chat box, type your question the way you would ask a co-worker. Examples:

- *"What does error E-04 mean?"*
- *"How do I clear alarm A-06?"*
- *"What is the recommended daily maintenance?"*
- *"The machine stopped and shows a red light — what should I check first?"*

Press **Enter** or click the send arrow. The answer appears within a few seconds.

### Read the answer carefully

Every answer ends with:

- **Sources** — the manual name and page number. If you want to verify, open the PDF to that page.
- **A severity tag** (info / minor / degraded / production impact / safety) — this tells you and your supervisor how serious the issue is.

If the answer says *"I could not find enough information in the documentation,"* it means the manual for this machine does not cover your question. Ask your supervisor.

---

## Follow-up questions

You do not have to repeat the error code every time. SmartFix remembers the last few turns of the conversation.

**Example:**

> You: *What is error E-04?*
> SmartFix: *E-04 is a hydraulic pressure fault…*
> You: *How do I fix it?*
> SmartFix: *To clear E-04, do the following steps…*

If you want to start a **fresh** topic (different problem, different error), click **New chat** at the top so the old conversation does not confuse the assistant.

---

## Tips for better answers

1. **Include the exact code.** "E-04", "A-06", "ERR-12" — these get matched directly against the manual, so quoting the code gives a much better answer than describing it ("the hydraulic error").
2. **One question at a time.** "What is E-04 and how do I fix it and what part do I need?" is harder than asking those one after another.
3. **Use plain words.** You don't need to phrase it formally. "Pump is loud" works.
4. **Don't paste error logs.** Just the code and a short description is enough.

---

## When SmartFix is wrong, or you are unsure

- **Always check the cited page** if the answer surprises you.
- **Never bypass a safety warning** the assistant gives you. If the answer mentions DANGER / WARNING / lock-out, follow it.
- If the answer disagrees with what your supervisor told you, **stop and ask your supervisor.** The manual may be out of date, or the question may have been misunderstood.

SmartFix is a helper, not a replacement for your judgement.

---

## Troubleshooting the app

| Problem | What to try |
|---|---|
| Page won't load | Check the workstation network cable, then refresh the page. |
| "Service temporarily unavailable" | Wait 30 seconds and re-send. If it keeps happening, tell your supervisor — the AI service may be down. |
| Wrong machine showing in the header | You are signed in on the wrong workstation, or the workstation was reassigned. Tell your supervisor. |
| Old chat won't load | Click **New chat** and re-ask the question. |

---

## Who to contact

- **Wrong / missing manual content** → your supervisor or the admin team.
- **App not working** → your supervisor.
- **Safety issue** → stop the machine and follow your site's safety procedure first. Then report.
