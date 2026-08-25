
/**
 * MANDATORY WORKER DIRECTIVE FOR ALL INTAKE PROJECTS:
 * 1. Provision dedicated repo: Mattjhagen/<project-slug>
 * 2. Build 5 distinct pages: index.html, services.html, about.html, pricing.html, contact.html
 * 3. Always-visible navigation header across all screen sizes
 * 4. Auto-enable GitHub Pages: gh api -X POST /repos/Mattjhagen/<project-slug>/pages
 * 5. Inject favicon.svg & enforce HTTPS (https_enforced=true)
 */
export interface CloudNode {
  id: string
  name: string
  provider: 'gcp' | 'aws' | 'azure'
  sshDestination: string
  role: 'primary' | 'fallback_1' | 'fallback_2'
  status: 'idle' | 'busy' | 'offline'
}

export const CLOUD_NODES: CloudNode[] = [
  {
    id: 'google-cloud-vm',
    name: 'GCP Primary Runner',
    provider: 'gcp',
    sshDestination: 'server-handoff-cloud',
    role: 'primary',
    status: 'idle',
  },
  {
    id: 'aws-ec2-runner',
    name: 'AWS EC2 Fallback Runner',
    provider: 'aws',
    sshDestination: 'aws-runner-cloud',
    role: 'fallback_1',
    status: 'idle',
  },
  {
    id: 'azure-vm-runner',
    name: 'Azure VM Fallback Runner',
    provider: 'azure',
    sshDestination: 'azure-runner-cloud',
    role: 'fallback_2',
    status: 'idle',
  },
]

export function selectAvailableCloudNode(activeJobsCount: number = 0): CloudNode {
  if (activeJobsCount === 0) {
    return CLOUD_NODES[0] // GCP Primary
  } else if (activeJobsCount === 1) {
    return CLOUD_NODES[1] // AWS Fallback 1
  } else {
    return CLOUD_NODES[2] // Azure Fallback 2
  }
}
