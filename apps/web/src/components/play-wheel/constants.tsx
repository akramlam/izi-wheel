import { User, Mail, Phone } from 'lucide-react';

// Mapping input types to icons
export const inputIcons: Record<string, React.ReactNode> = {
  name: <User className="h-4 w-4 text-gray-400" />,
  email: <Mail className="h-4 w-4 text-gray-400" />,
  phone: <Phone className="h-4 w-4 text-gray-400" />,
};

// Brand colors
export const BRAND = {
  primaryGradient: '#a25afd', // Violet
  secondaryGradient: '#6366f1', // Indigo
  backgroundGradient: 'linear-gradient(to bottom right, rgb(216, 180, 254), rgb(224, 231, 255))',
};

// Confetti colors
export const CONFETTI_COLORS = [
  BRAND.primaryGradient,
  BRAND.secondaryGradient,
  '#ff5e7e',
  '#88ff5a',
  '#fcff42',
  '#ffa62d',
  '#ff36ff',
];

// TypeScript declaration for window property
declare global {
  interface Window {
    fallbackTimeout?: NodeJS.Timeout | null;
    immediateFallback?: NodeJS.Timeout | null;
  }
}