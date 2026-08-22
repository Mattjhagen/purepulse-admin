// Preview rendering policy (issue #25 AC7): previews render only as a
// sandboxed iframe WITHOUT scripts/same-origin, or as an external-tab link.
// An empty sandbox string is the most restrictive HTML5 sandbox: unique
// origin, no scripts, no forms, no popups.
export const PREVIEW_IFRAME_SANDBOX = ''

export type PreviewVersionKind = 'draft' | 'staging' | 'released'

export function previewDisplayMode(kind: PreviewVersionKind): 'iframe' | 'external' {
  return kind === 'released' ? 'iframe' : 'external'
}
