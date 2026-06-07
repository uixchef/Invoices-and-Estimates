/** Selectable AI models shown in the prompt composers (Figma: 3150:142530). */
export type AiModel = {
  id: string
  name: string
  description: string
}

export const AI_MODELS: AiModel[] = [
  {
    id: "sonnet-4-6",
    name: "Sonnet 4.6",
    description: "Most efficient for everyday tasks",
  },
  {
    id: "opus-4-6",
    name: "Opus 4.6",
    description: "Most capable for ambitious work",
  },
  {
    id: "gpt-5-4",
    name: "GPT 5.4",
    description: "Alternative AI model",
  },
]
