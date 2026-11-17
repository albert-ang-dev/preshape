// POST /api/questions   (logged-in users only)
// Body:    { job_title: string, job_description: string }
// Returns: { interviewId, questions: string[10], interviewsThisMonth, interviewsPerMonth }
//
// Checks the monthly limit, generates the questions with OpenAI, and saves the
// interview right away with status 'in_progress'. Saving at the start means an
// interview counts towards the limit even if the user never finishes it.
import OpenAI from 'openai'

// Limits keep requests (and costs) reasonable
const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const jobTitle = String(body?.job_title ?? '').trim()
  const jobDescription = String(body?.job_description ?? '').trim()

  // Check the input before spending money on an OpenAI request
  if (!jobTitle) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter a job title.' })
  }
  if (!jobDescription) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter a job description.' })
  }
  if (jobTitle.length > MAX_TITLE_LENGTH || jobDescription.length > MAX_DESCRIPTION_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: 'The job title or description is too long.' })
  }

  // Monthly limit: checked before any money is spent on OpenAI
  const usage = await getMonthlyUsage(user.id, user.email)
  if (usage.remaining <= 0) {
    const resetDate = new Date(usage.resetsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
    throw createError({
      statusCode: 403,
      statusMessage: `You've used all ${usage.limit} interviews for this month. Your interviews reset on ${resetDate}.`,
    })
  }

  // Reads OPENAI_API_KEY from .env
  const openai = new OpenAI()

  const response = await openai.responses.create({
    model: 'gpt-5.5',
    instructions: [
      'You are an experienced job interviewer preparing a practice interview.',
      'Write exactly 10 interview questions for the job described by the user.',
      'Base the questions on the job title and description: mix questions about relevant',
      'skills and experience with behavioural questions (teamwork, problem-solving, handling pressure).',
      'Start with an easy opening question. Each question must be a single question,',
      'written the way an interviewer would say it, without numbering.',
    ].join(' '),
    input: `Job title: ${jobTitle}\n\nJob description:\n${jobDescription}`,
    // Structured output: the reply must be JSON in exactly this shape
    text: {
      format: {
        type: 'json_schema',
        name: 'interview_questions',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['questions'],
          additionalProperties: false,
        },
      },
    },
  })

  const data = JSON.parse(response.output_text)

  // The schema guarantees a list of text, but not its length
  if (!Array.isArray(data.questions) || data.questions.length !== 10) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not generate 10 questions. Please try again.',
    })
  }

  const questions = (data.questions as unknown[]).map(q => String(q))

  // Save the interview now, so it counts towards this month's limit
  const { data: interview, error } = await useSupabase()
    .from('interviews')
    .insert({
      user_id: user.id,
      job_title: jobTitle,
      status: 'in_progress',
      questions: questions.map(question => ({ question, answer: null, score: null, feedback: null })),
    })
    .select('id')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Could not start the interview: ${error.message}` })
  }

  return {
    interviewId: interview.id,
    questions,
    interviewsThisMonth: usage.used + 1,
    interviewsPerMonth: usage.limit,
  }
})
