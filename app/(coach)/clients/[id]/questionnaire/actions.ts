'use server'

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { CHECK_IN_STATUS } from '@/lib/check-in-status'
import {
  parseCoachQuestions,
  MAX_ANSWER_LENGTH,
  type AnswerSnapshot,
} from '@/lib/questionnaire'

export type QuestionnaireFormErrors = { _form?: string }

export async function saveClientQuestionnaire(
  clientId: string,
  _prev: QuestionnaireFormErrors,
  formData: FormData,
): Promise<QuestionnaireFormErrors> {
  // Ownership chain identical to the check-in actions: session -> coach owns
  // client. The question list comes from the COACH'S row, never the form, so
  // a forged field name can never mint an answer to a question that doesn't
  // exist.
  const coach = await verifyCoachSession()

  const client = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { id: true },
  })
  if (!client) return { _form: 'Client not found.' }

  const questions = parseCoachQuestions(coach.questionnaire)

  // Build the answer SNAPSHOT server-side: each answer records the label and
  // type as they are right now, so later question edits can never silently
  // change what this answer meant (see lib/questionnaire.ts). Blank fields are
  // simply unanswered — every question is optional.
  const answers: AnswerSnapshot[] = []
  for (const q of questions) {
    const raw = ((formData.get(`q_${q.id}`) as string | null) ?? '').trim()
    if (!raw) continue
    if (raw.length > MAX_ANSWER_LENGTH)
      return { _form: `"${q.label}" is too long (max ${MAX_ANSWER_LENGTH} characters).` }
    if (q.type === 'number' && Number.isNaN(Number(raw)))
      return { _form: `"${q.label}" must be a number.` }
    if (q.type === 'select' && !(q.options ?? []).includes(raw))
      return { _form: `"${q.label}" has an invalid selection.` }
    answers.push({ questionId: q.id, label: q.label, type: q.type, value: raw })
  }

  const answerSet = { answeredAt: new Date().toISOString(), answers }

  try {
    // New/changed background context invalidates cached analyses that were
    // generated without it — clear this client's non-approved aiSynthesis in
    // the SAME transaction (the established language-change pattern), so both
    // writes land or neither does. Approved history stays frozen.
    await prisma.$transaction([
      prisma.client.update({
        where: { id: clientId },
        data:  { questionnaireAnswers: answerSet as unknown as Prisma.InputJsonValue },
      }),
      prisma.checkIn.updateMany({
        where: { clientId, status: { not: CHECK_IN_STATUS.Approved } },
        data:  { aiSynthesis: null },
      }),
    ])
  } catch (err) {
    console.error('[saveClientQuestionnaire]', err)
    return { _form: 'Something went wrong saving the questionnaire. Please try again.' }
  }

  redirect(`/clients/${clientId}`)
}
