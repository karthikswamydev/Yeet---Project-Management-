export type Provider = 'aws' | 'gcp' | 'azure' | 'cloudflare' | 'vercel' | 'digitalocean' | 'other'
export type Environment = 'production' | 'staging' | 'development' | 'shared'
export type ResourceStatus = 'active' | 'planned' | 'retired'

export const PROVIDERS: Record<Provider, { label: string; short: string; color: string; text: string }> = {
  aws: { label: 'Amazon Web Services', short: 'AWS', color: '#232f3e', text: '#ff9900' },
  gcp: { label: 'Google Cloud', short: 'GCP', color: '#e8f0fe', text: '#1a73e8' },
  azure: { label: 'Microsoft Azure', short: 'Azure', color: '#e5f1fb', text: '#0067b8' },
  cloudflare: { label: 'Cloudflare', short: 'CF', color: '#fff1e6', text: '#c25700' },
  vercel: { label: 'Vercel', short: 'Vercel', color: '#111111', text: '#ffffff' },
  digitalocean: { label: 'DigitalOcean', short: 'DO', color: '#e6f0ff', text: '#0061eb' },
  other: { label: 'Other', short: 'Other', color: '#f1f2f4', text: '#44546f' },
}

export const PROVIDER_ORDER = Object.keys(PROVIDERS) as Provider[]

// Suggestions only; any service name is allowed.
export const SERVICES: Record<Provider, string[]> = {
  aws: ['EC2', 'S3', 'RDS', 'Lambda', 'ECS', 'EKS', 'CloudFront', 'DynamoDB', 'ElastiCache', 'SQS', 'SNS', 'API Gateway', 'Route 53', 'Cognito', 'Elastic Load Balancing', 'CloudWatch', 'Secrets Manager'],
  gcp: ['Compute Engine', 'Cloud Storage', 'Cloud SQL', 'Cloud Run', 'GKE', 'Cloud Functions', 'BigQuery', 'Pub/Sub', 'Firestore', 'Memorystore', 'Cloud CDN'],
  azure: ['Virtual Machines', 'Blob Storage', 'Azure SQL', 'App Service', 'AKS', 'Functions', 'Cosmos DB', 'Service Bus', 'Front Door', 'Key Vault'],
  cloudflare: ['Workers', 'R2', 'Pages', 'DNS', 'D1', 'KV', 'Queues', 'Zero Trust'],
  vercel: ['Project', 'Postgres', 'KV', 'Blob', 'Edge Config', 'Domains'],
  digitalocean: ['Droplet', 'Spaces', 'Managed Database', 'App Platform', 'Kubernetes', 'Load Balancer'],
  other: ['Domain', 'Email', 'Monitoring', 'Database', 'Storage', 'CI/CD'],
}

export const REGIONS: Partial<Record<Provider, string[]>> = {
  aws: ['us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-south-1', 'ap-southeast-1', 'ap-northeast-1'],
  gcp: ['us-central1', 'us-east1', 'europe-west1', 'asia-south1', 'asia-southeast1'],
  azure: ['eastus', 'westus2', 'westeurope', 'centralindia', 'southeastasia'],
  digitalocean: ['nyc3', 'sfo3', 'ams3', 'fra1', 'blr1', 'sgp1'],
}

export const ENVIRONMENTS: Environment[] = ['production', 'staging', 'development', 'shared']

export const ENV_LABEL: Record<Environment, string> = {
  production: 'Production',
  staging: 'Staging',
  development: 'Development',
  shared: 'Shared',
}

export const STATUS_LABEL: Record<ResourceStatus, string> = { active: 'Active', planned: 'Planned', retired: 'Retired' }

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
export const formatCost = (n: number | null) => (n === null ? '—' : usd.format(n))
