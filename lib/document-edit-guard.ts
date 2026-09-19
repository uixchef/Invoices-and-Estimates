export function documentMutationsLocked(input: {
  previewingVersion: boolean
  compareWithReference: boolean
}): boolean {
  return input.previewingVersion || input.compareWithReference
}
