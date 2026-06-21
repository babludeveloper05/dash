import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { checkCsrf } from '@/lib/csrf'

export const runtime = 'nodejs'
// Doubt-solving is a per-request AI call — never cache.
export const dynamic = 'force-dynamic'

interface AskBody {
  question?: unknown
  subject?: unknown
  track?: unknown
  subjects?: unknown
}

const MAX_QUESTION_LEN = 2000

// Sanitize a free-form string from the client. The subject can now be anything
// the user picked during onboarding (not just the 6 hardcoded science ones) —
// e.g. "System Design", "Typography", "Vocabulary", "Nutrition". We accept any
// non-empty string ≤ 60 chars to keep the prompt bounded.
function sanitizeSubject(v: unknown): string {
  if (typeof v !== 'string') return 'General'
  const s = v.trim().slice(0, 60)
  return s || 'General'
}

function sanitizeTrack(v: unknown): string {
  if (typeof v !== 'string') return 'Learner'
  const s = v.trim().slice(0, 60)
  return s || 'Learner'
}

function sanitizeSubjects(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim().slice(0, 60))
    .filter((x) => x.length > 0)
    .slice(0, 12)
}

/**
 * POST /api/doubts/ask
 *
 * Body: { question: string, subject: string, track?: string, subjects?: string[] }
 * Returns: { answer: string } — a worked, step-by-step solution from an
 * expert AI tutor that adapts its persona to the user's field (student,
 * developer, designer, language learner, anyone).
 *
 * The z-ai-web-dev-sdk is used server-side only (per SDK contract).
 */
export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError

  let body: AskBody
  try {
    body = (await req.json()) as AskBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const subject = sanitizeSubject(body.subject)
  const track = sanitizeTrack(body.track)
  const subjects = sanitizeSubjects(body.subjects)

  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }
  if (question.length > MAX_QUESTION_LEN) {
    return NextResponse.json(
      { error: `Question is too long (max ${MAX_QUESTION_LEN} chars)` },
      { status: 400 }
    )
  }

  try {
    const zai = await ZAI.create()

    // Field-aware persona. The tutor adapts to whatever the user is working
    // on — competitive exams, software engineering, design, languages, fitness,
    // anything. The track + subject list give the model context to tune its
    // examples and tone without being locked to "JEE/NEET aspirants".
    const focusLine = subjects.length > 0
      ? `The learner is focusing on: ${subjects.join(', ')}.`
      : `The learner is focusing on ${subject}.`
    const systemPrompt = [
      `You are Delta AI Tutor — an expert mentor for a ${track}.`,
      `The current question is about ${subject}.`,
      focusLine,
      'Adapt your explanation, examples, and tone to this field. For technical/professional fields (software, data, design, finance) use industry-appropriate terminology and real-world scenarios. For academic fields use exam-grade rigor. For personal-growth fields (languages, fitness, music, writing) be practical and motivating.',
      "Solve the learner's doubt with a clear, step-by-step explanation.",
      'Guidelines:',
      '- Start with a one-line direct answer or key insight.',
      '- Then walk through the reasoning in numbered steps.',
      '- Use plain text (no Markdown tables, no code fences). You may use *italics* sparingly for emphasis. Code snippets are fine inline when the field demands it.',
      '- Include a concrete example or illustration when it clarifies the concept.',
      '- End with a short "Takeaway" line.',
      '- Keep it under ~220 words. Be encouraging and precise — never hand-wave.',
      '- If the doubt is ambiguous, state your assumption before solving.',
    ].join('\n')

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: question },
      ],
      thinking: { type: 'disabled' },
    })

    const answer = completion.choices[0]?.message?.content?.trim()
    if (!answer) {
      return NextResponse.json(
        { error: 'The tutor returned an empty response. Please rephrase and try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ answer })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/doubts/ask] failed:', message)
    return NextResponse.json(
      { error: 'The tutor is unavailable right now. Please try again in a moment.' },
      { status: 502 }
    )
  }
}
