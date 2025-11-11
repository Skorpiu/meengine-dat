
/**
 * License Feature Definitions
 * 
 * This file defines all available features and their classification:
 * - BASE: Included in the base package
 * - PREMIUM: Requires upgrade to unlock
 */

export type FeatureKey = 
  | 'STUDENT_ACCESS'
  | 'VEHICLE_MANAGEMENT'
  | 'LESSON_MANAGEMENT'
  | 'SCREENSHOT_PROTECTION'
  | 'ADVANCED_REPORTING'
  | 'SMS_NOTIFICATIONS'
  | 'MOBILE_APP'
  | 'PAYMENT_INTEGRATION'
  | 'MULTI_LANGUAGE';

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
  category: 'BASE' | 'PREMIUM';
  icon: string;
}

export const FEATURE_DEFINITIONS: Record<FeatureKey, FeatureDefinition> = {
  STUDENT_ACCESS: {
    key: 'STUDENT_ACCESS',
    name: 'Student Login Access',
    description: 'Allow students to log in and view their lessons, progress, and schedule',
    category: 'PREMIUM',
    icon: '👨‍🎓',
  },
  VEHICLE_MANAGEMENT: {
    key: 'VEHICLE_MANAGEMENT',
    name: 'Vehicle Management',
    description: 'Manage vehicles, maintenance schedules, and vehicle assignments',
    category: 'PREMIUM',
    icon: '🚗',
  },
  LESSON_MANAGEMENT: {
    key: 'LESSON_MANAGEMENT',
    name: 'Lesson Management',
    description: 'View and track recent and upcoming lessons across all categories',
    category: 'PREMIUM',
    icon: '📚',
  },
  SCREENSHOT_PROTECTION: {
    key: 'SCREENSHOT_PROTECTION',
    name: 'Screenshot Protection',
    description: 'Prevent screenshots and screen recordings on sensitive pages',
    category: 'PREMIUM',
    icon: '🔒',
  },
  ADVANCED_REPORTING: {
    key: 'ADVANCED_REPORTING',
    name: 'Advanced Reporting',
    description: 'Generate detailed reports with analytics and insights',
    category: 'PREMIUM',
    icon: '📊',
  },
  SMS_NOTIFICATIONS: {
    key: 'SMS_NOTIFICATIONS',
    name: 'SMS Notifications',
    description: 'Send automated SMS reminders to students and instructors',
    category: 'PREMIUM',
    icon: '📱',
  },
  MOBILE_APP: {
    key: 'MOBILE_APP',
    name: 'Mobile App Access',
    description: 'Native mobile app for iOS and Android',
    category: 'PREMIUM',
    icon: '📲',
  },
  PAYMENT_INTEGRATION: {
    key: 'PAYMENT_INTEGRATION',
    name: 'Payment Integration',
    description: 'Integrated payment processing and invoicing',
    category: 'PREMIUM',
    icon: '💳',
  },
  MULTI_LANGUAGE: {
    key: 'MULTI_LANGUAGE',
    name: 'Multi-Language Support',
    description: 'Support for multiple languages including Portuguese',
    category: 'PREMIUM',
    icon: '🌍',
  },
};

// Get all premium features
export function getPremiumFeatures(): FeatureDefinition[] {
  return Object.values(FEATURE_DEFINITIONS).filter(f => f.category === 'PREMIUM');
}

// Get all base features
export function getBaseFeatures(): FeatureDefinition[] {
  return Object.values(FEATURE_DEFINITIONS).filter(f => f.category === 'BASE');
}

// Check if a feature is premium
export function isPremiumFeature(featureKey: FeatureKey): boolean {
  return FEATURE_DEFINITIONS[featureKey]?.category === 'PREMIUM';
}
