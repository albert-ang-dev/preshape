// POST /api/interviews   (logged-in users only)
// Body:    { interview_id, job_description, answers: string[10] }
// Returns: Premium: { id, overall_score, overall_feedback, questions: [{ question, answer, score, feedback }] }
//          Free:    { id, overall_score, overall_feedback }   (score and summary only)
//
// Called once the interview is finished: grades the answers with OpenAI, then
// completes the interview row that /api/questions created when it started.
// The questions come from the database, not the browser, so they can't be swapped.
import OpenAI from 'openai'

const QUESTION_COUNT = 10
const MAX_ANSWER_LENGTH = 5000
const MAX_DESCRIPTION_LENGTH = 5000

// Turns anything into a trimmed string
const text = (value: unknown) => String(value ?? '').trim()

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const interviewId = text(body?.interview_id)
  const jobDescription = text(body?.job_description).slice(0, MAX_DESCRIPTION_LENGTH)
  const answers: string[] = Array.isArray(body?.answers) ? body.answers.map(text) : []

  // Check the input before spending money on OpenAI
  if (!interviewId) {
    throw createError({ statusCode: 400, statusMessage: 'The interview ID is missing.' })
  }
  if (answers.length !== QUESTION_COUNT) {
    throw createError({ statusCode: 400, statusMessage: `Expected ${QUESTION_COUNT} answers.` })
  }
  if (answers.some(answer => answer.length > MAX_ANSWER_LENGTH)) {
    throw createError({ statusCode: 400, statusMessage: 'One of the answers is too long.' })
  }

  // Load the interview this user started
  const supabase = useSupabase()
  const { data: started, error: loadError } = await supabase
    .from('interviews')
    .select('id, job_title, status, questions')
    .eq('id', interviewId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (loadError) {
    throw createError({ statusCode: 500, statusMessage: `Could not load the interview: ${loadError.message}` })
  }
  if (!started) {
    throw createError({ statusCode: 404, statusMessage: 'Interview not found.' })
  }
  if (started.status !== 'in_progress') {
    throw createError({ statusCode: 409, statusMessage: 'This interview has already been graded.' })
  }

  const jobTitle: string = started.job_title
  const questions: string[] = (started.questions as { question: string }[]).map(q => q.question)

  // --- 1. Grade the answers with OpenAI ---
  const openai = new OpenAI()

  const transcript = questions
    .map((question, i) => `Question ${i + 1}: ${question}\nAnswer ${i + 1}: ${answers[i] || '(no answer)'}`)
    .join('\n\n')

  const response = await openai.responses.create({
    model: 'gpt-5.5',
    instructions: [
      'You are an experienced, fair and encouraging job interviewer grading a practice interview.',
      `Grade each of the ${QUESTION_COUNT} answers in order, from 0 (no or irrelevant answer) to 10 (excellent),`,
      'with one or two sentences of specific feedback addressed to the candidate ("you").',
      'Then give an overall score from 0 to 100 and a short overall summary:',
      'what went well and the most important things to improve.',
      'Judge the answers against the job title and description.',
    ].join(' '),
    input: `Job title: ${jobTitle}\n\nJob description:\n${jobDescription || '(not given)'}\n\n${transcript}`,
    text: {
      format: {
        type: 'json_schema',
        name: 'interview_grading',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            grades: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  score: { type: 'integer' },
                  feedback: { type: 'string' },
                },
                required: ['score', 'feedback'],
                additionalProperties: false,
              },
            },
            overall_score: { type: 'integer' },
            overall_feedback: { type: 'string' },
          },
          required: ['grades', 'overall_score', 'overall_feedback'],
          additionalProperties: false,
        },
      },
    },
  })

  const grading = JSON.parse(response.output_text)

  if (!Array.isArray(grading.grades) || grading.grades.length !== QUESTION_COUNT) {
    throw createError({ statusCode: 502, statusMessage: 'Grading failed. Please try again.' })
  }

  // Keep scores inside their ranges, in case the model strays
  const clamp = (n: number, max: number) => Math.min(max, Math.max(0, Math.round(Number(n) || 0)))

  // One object per question, matching the "questions" jsonb column
  const gradedQuestions = questions.map((question, i) => ({
    question,
    answer: answers[i],
    score: clamp(grading.grades[i].score, 10),
    feedback: String(grading.grades[i].feedback),
  }))

  // --- 2. Complete the interview row in Supabase ---
  // The status check makes sure an interview can only be graded once,
  // even if the request is sent twice.
  const { data: interview, error } = await supabase
    .from('interviews')
    .update({
      status: 'completed',
      questions: gradedQuestions,
      overall_score: clamp(grading.overall_score, 100),
      overall_feedback: String(grading.overall_feedback),
    })
    .eq('id', interviewId)
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .select('id, overall_score, overall_feedback, questions')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Could not save the interview: ${error.message}` })
  }
  if (!interview) {
    throw createError({ statusCode: 409, statusMessage: 'This interview has already been graded.' })
  }

  // The full breakdown is always SAVED, but only Premium users get it back.
  // Free users get the overall score and summary only. Filtering here, on the
  // server, means the breakdown never reaches a Free user's browser.
  if (await getPlan(user.id) !== 'premium') {
    return {
      id: interview.id,
      overall_score: interview.overall_score,
      overall_feedback: interview.overall_feedback,
    }
  }

  return interview
})
