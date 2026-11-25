export const MIN_PASSWORD_LENGTH = 8

export function validatePasswordChangeInput(currentPassword: string, newPassword: string, confirmPassword: string): string | null {
  if (!currentPassword || !newPassword || !confirmPassword) return 'Complete all password fields.'
  if (newPassword.length < MIN_PASSWORD_LENGTH) return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  if (newPassword !== confirmPassword) return 'New password and confirmation do not match.'
  if (currentPassword === newPassword) return 'New password must be different from the current password.'
  return null
}
