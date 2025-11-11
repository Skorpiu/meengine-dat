
/**
 * Feature Configuration System
 * 
 * This file controls which features are enabled for each client.
 * Set feature flags to true/false based on client's purchased package.
 * 
 * For license management:
 * - Each feature can be toggled individually
 * - Future: Add license key verification and expiration dates
 */

export const FEATURE_CONFIG = {
  // Client Configuration
  drivingSchoolName: "Driving School Academy", // Customize per client
  drivingSchoolLogo: null, // URL to custom logo (optional)
  primaryColor: "#2563eb", // Blue
  secondaryColor: "#dc2626", // Red
  
  // Feature Flags (true = enabled, false = disabled)
  features: {
    // Core Features
    lessonManagement: true,
    vehicleManagement: true,
    userManagement: true,
    
    // Advanced Features
    scheduleMap: true,
    progressTracking: true,
    examScheduling: true,
    
    // Premium Features
    monthlyPerformance: true,
    studentSatisfaction: false, // Rating mechanism for lessons and instructors
    advancedReporting: false,
    mobileApp: false,
    smsNotifications: false,
    emailNotifications: true,
    
    // Additional Features
    multiLanguageSupport: true,
    categoryManagement: true,
    paymentIntegration: false,
  }
}

// Helper function to check if a feature is enabled
export function isFeatureEnabled(featureName: keyof typeof FEATURE_CONFIG.features): boolean {
  return FEATURE_CONFIG.features[featureName] || false
}

// Get driving school name
export function getDrivingSchoolName(): string {
  return FEATURE_CONFIG.drivingSchoolName
}

// Get colors
export function getThemeColors() {
  return {
    primary: FEATURE_CONFIG.primaryColor,
    secondary: FEATURE_CONFIG.secondaryColor,
  }
}

// Future: License Key Verification
export interface LicenseInfo {
  featureName: string
  licenseKey: string
  expirationDate: Date
  isActive: boolean
}

// Future: Implement license verification logic
export function verifyLicense(featureName: string, licenseKey: string): boolean {
  // TODO: Implement license verification with backend
  // This would check if the license key is valid and not expired
  return true
}
