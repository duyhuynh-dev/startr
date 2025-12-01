/**
 * Pre-defined supported markets for matching
 * Both investors and founders can only select from this list
 */

export const SUPPORTED_MARKETS = [
  // Technology
  'B2B SaaS',
  'Enterprise Software',
  'Consumer Tech',
  'Fintech',
  'Healthtech',
  'Edtech',
  'PropTech',
  'LegalTech',
  'HR Tech',
  'MarTech',
  'AdTech',
  'Deep Tech',
  'AI/ML',
  'Blockchain',
  'Cybersecurity',
  'Cloud Computing',
  'DevTools',
  'Infrastructure',
  'Data Analytics',
  'IoT',
  'AR/VR',
  'Gaming',
  'Mobile Apps',
  'Web3',
  
  // Industries
  'Healthcare',
  'Biotech',
  'Pharma',
  'Medical Devices',
  'Telemedicine',
  'Fitness & Wellness',
  'Mental Health',
  
  'Financial Services',
  'Banking',
  'Insurance',
  'Payments',
  'Crypto',
  'Wealth Management',
  
  'E-commerce',
  'Retail',
  'Marketplace',
  'Food & Beverage',
  'Fashion',
  'Luxury',
  
  'Transportation',
  'Logistics',
  'Supply Chain',
  'Mobility',
  'Automotive',
  
  'Energy',
  'Clean Energy',
  'Solar',
  'Renewable Energy',
  'Sustainability',
  'Climate Tech',
  
  'Agriculture',
  'AgTech',
  'Food Tech',
  
  'Real Estate',
  'Construction',
  'Smart Home',
  
  'Education',
  'Online Learning',
  'Corporate Training',
  
  'Media & Entertainment',
  'Content Creation',
  'Streaming',
  'Social Media',
  'News & Publishing',
  
  'Travel & Hospitality',
  'Hotels',
  'Restaurants',
  'Tourism',
  
  'Manufacturing',
  'Industrial',
  '3D Printing',
  
  'Non-profit',
  'Social Impact',
  'Government',
  
  // Markets by size/type
  'SMB',
  'Mid-Market',
  'Enterprise',
  'Consumer',
  'B2B',
  'B2C',
  'B2B2C',
  
  // Geographic markets
  'North America',
  'United States',
  'Canada',
  'Latin America',
  'Europe',
  'United Kingdom',
  'Asia Pacific',
  'China',
  'India',
  'Southeast Asia',
  'Middle East',
  'Africa',
  'Global',
] as const;

export type SupportedMarket = typeof SUPPORTED_MARKETS[number];

