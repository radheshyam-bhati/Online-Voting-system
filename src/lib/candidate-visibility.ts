/**
 * Determines if a candidate's profile (public statement and photo) should be visible to students.
 * 
 * According to the visibility rules:
 * - Visible when election status is 'open', 'closed', or 'published'
 * - Hidden when election status is 'draft', 'nomination', 'scheduled', or 'voided'
 * 
 * This is a pure function with no side effects, safe to use in both server and client components.
 * 
 * @param electionStatus - The current status of the election
 * @returns true if candidate profiles (public statement and photo) should be visible
 */
export function isCandidateProfileVisible(electionStatus: string): boolean {
  return ['open', 'closed', 'published'].includes(electionStatus);
}