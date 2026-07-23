import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { verifyCoachSession } from '@/lib/dal'
import { parseCoachQuestions, parseAnswerSet } from '@/lib/questionnaire'
import { QuestionnaireForm } from './QuestionnaireForm'

export default async function ClientQuestionnairePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const coach = await verifyCoachSession()
  const { id: clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId, coachId: coach.id },
    select: { id: true, name: true, questionnaireAnswers: true },
  })
  if (!client) notFound()

  return (
    <QuestionnaireForm
      clientId={client.id}
      clientName={client.name}
      questions={parseCoachQuestions(coach.questionnaire)}
      answerSet={parseAnswerSet(client.questionnaireAnswers)}
    />
  )
}
