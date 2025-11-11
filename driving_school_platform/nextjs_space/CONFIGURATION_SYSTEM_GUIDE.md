# Configuration Management System Guide

## Overview

Your driving school platform now includes a comprehensive configuration management system with **five major enhancement areas**:

1. ✅ **Settings Management UI** - Full CRUD for system settings
2. ✅ **Enhanced Setting Types** - STRING, INTEGER, BOOLEAN, JSON, DECIMAL
3. ✅ **Feature Flags** - Dynamic feature toggles with A/B testing
4. ✅ **User Preferences** - Individual user customizations
5. ✅ **Configuration APIs** - RESTful endpoints for all operations

---

## 🎯 Key Features

### 1. System Settings Management

**Location:** `/admin/settings` → System Settings Tab

**Capabilities:**
- ✅ Create, Read, Update, Delete system settings
- ✅ Organize settings by categories
- ✅ Five data types: STRING, INTEGER, BOOLEAN, JSON, DECIMAL
- ✅ Public/Private visibility control
- ✅ Full search and filtering
- ✅ Audit trail of all changes

**Example Use Cases:**
```javascript
// Programmatic access
import { getSystemSetting, setSystemSetting } from '@/lib/config-utils';

// Get a setting
const maxLessonDuration = await getSystemSetting<number>('max_lesson_duration', 120);

// Set a setting
await setSystemSetting('lesson_reminder_hours', 24, 'INTEGER', {
  category: 'notifications',
  description: 'Hours before lesson to send reminder',
  isPublic: false
});
```

**Setting Categories:**
- `general` - Business information and contact details
- `lessons` - Lesson scheduling and booking preferences
- `notifications` - Email and notification settings
- `exams` - Examination and testing configuration
- Custom categories as needed

---

### 2. Feature Flags System

**Location:** `/admin/settings` → Feature Flags Tab

**Capabilities:**
- ✅ Toggle features on/off dynamically
- ✅ Gradual rollout (0-100% of users)
- ✅ Role-based targeting (SUPER_ADMIN, INSTRUCTOR, STUDENT)
- ✅ User-specific targeting
- ✅ Environment control (production, staging, development)
- ✅ Time-limited features with expiration dates
- ✅ Categorization and tagging

**Example Usage:**
```javascript
import { isFeatureEnabled } from '@/lib/config-utils';

// Check if feature is enabled for current user
const showNewDashboard = await isFeatureEnabled(
  'enable_new_dashboard',
  session?.user?.id,
  session?.user?.role
);

if (showNewDashboard) {
  // Show new dashboard
} else {
  // Show old dashboard
}
```

**Feature Flag Properties:**
- **Flag Key:** Unique identifier (e.g., `enable_video_lessons`)
- **Flag Name:** Human-readable name
- **Is Enabled:** Global on/off switch
- **Rollout Percent:** Gradual rollout percentage
- **Enabled For Roles:** Array of roles that can see the feature
- **Enabled For Users:** Array of specific user IDs
- **Environment:** production, staging, or development
- **Expires At:** Optional expiration date

**Advanced Features:**
- **Deterministic Rollout:** Same user always gets same result based on hash
- **A/B Testing:** Control feature exposure to percentage of users
- **Instant Toggle:** No code deployment needed to enable/disable features

---

### 3. User Preferences

**Location:** `/preferences` (All users)

**Capabilities:**
Users can customize their experience across six categories:

#### Interface & Appearance
- Theme (Light, Dark, Auto)
- Language (English, Portuguese)

#### Notifications
- Email, Push, SMS notifications
- Specific notification types:
  - Lesson reminders
  - Exam reminders
  - Payment reminders
  - Promotional emails
  - Weekly digest

#### Dashboard & Display
- Default dashboard view (Overview, Calendar, List)
- Number of lessons to display (3-20)
- Show/hide completed lessons

#### Calendar Settings
- Default calendar view (Day, Week, Month)
- Week starts on (Monday, Sunday)
- Time format (12h, 24h)

#### Privacy & Sharing
- Profile visibility (Public, School, Private)
- Show progress to instructors
- Allow contact from instructors

#### Accessibility
- Font size (Small, Medium, Large)
- High contrast mode
- Reduced motion

**Example Usage:**
```javascript
import { getUserPreferences } from '@/lib/config-utils';

// Get user preferences
const prefs = await getUserPreferences(userId);

// Apply preferences
if (prefs.theme === 'dark') {
  // Apply dark theme
}
if (prefs.language === 'pt') {
  // Show Portuguese interface
}
```

---

## 📡 API Endpoints

### System Settings API

```typescript
// Get all settings (admin only)
GET /api/admin/settings?category=general&isPublic=true&search=lesson

// Create setting (admin only)
POST /api/admin/settings
{
  "settingKey": "max_students_per_exam",
  "settingValue": "2",
  "settingType": "INTEGER",
  "category": "exams",
  "description": "Maximum students allowed per exam",
  "isPublic": false
}

// Update setting (admin only)
PUT /api/admin/settings
{
  "settingKey": "max_students_per_exam",
  "settingValue": "3"
}

// Delete setting (admin only)
DELETE /api/admin/settings?key=max_students_per_exam
```

### Feature Flags API

```typescript
// Get all flags (admin only)
GET /api/admin/feature-flags?environment=production&category=ui

// Create flag (admin only)
POST /api/admin/feature-flags
{
  "flagKey": "enable_new_booking_flow",
  "flagName": "New Booking Flow",
  "description": "Redesigned lesson booking interface",
  "isEnabled": true,
  "rolloutPercent": 25,
  "environment": "production",
  "category": "ui"
}

// Update flag (admin only)
PUT /api/admin/feature-flags
{
  "flagKey": "enable_new_booking_flow",
  "rolloutPercent": 50
}

// Delete flag (admin only)
DELETE /api/admin/feature-flags?key=enable_new_booking_flow
```

### User Preferences API

```typescript
// Get user preferences
GET /api/user/preferences

// Update user preferences
PUT /api/user/preferences
{
  "theme": "dark",
  "language": "pt",
  "emailNotifications": true,
  "lessonDisplayCount": 10
}
```

### Public Configuration API

```typescript
// Get public settings (no authentication required)
GET /api/config/public

// Get feature flags for current user
GET /api/config/features
```

### Configuration History API

```typescript
// Get change history (admin only)
GET /api/admin/config-history?entityType=FeatureFlag&limit=50
```

---

## 🗄️ Database Models

### SystemSetting
```prisma
model SystemSetting {
  id           String      @id @default(cuid())
  settingKey   String      @unique
  settingValue String
  settingType  SettingType @default(STRING)
  description  String?
  category     String?
  isPublic     Boolean     @default(false)
  updatedBy    String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}
```

### FeatureFlag
```prisma
model FeatureFlag {
  id              String   @id @default(cuid())
  flagKey         String   @unique
  flagName        String
  description     String?
  isEnabled       Boolean  @default(false)
  enabledForRoles String[]
  enabledForUsers String[]
  rolloutPercent  Int      @default(0)
  environment     String   @default("production")
  category        String?
  tags            String[]
  createdBy       String?
  updatedBy       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  expiresAt       DateTime?
}
```

### UserPreference
```prisma
model UserPreference {
  id                          String   @id @default(cuid())
  userId                      String   @unique
  theme                       String   @default("light")
  language                    String   @default("en")
  emailNotifications          Boolean  @default(true)
  // ... (see schema for all fields)
}
```

### ConfigurationHistory
```prisma
model ConfigurationHistory {
  id            String   @id @default(cuid())
  entityType    String
  entityId      String
  entityKey     String?
  action        String
  oldValue      Json?
  newValue      Json?
  changedBy     String?
  changedByRole String?
  changedAt     DateTime @default(now())
  changeReason  String?
  ipAddress     String?
}
```

---

## 🛠️ Utility Functions

### config-utils.ts

```typescript
// System Settings
getSystemSetting<T>(key: string, defaultValue?: T): Promise<T | undefined>
setSystemSetting(key: string, value: any, type: SettingType, options?): Promise<void>

// Feature Flags
isFeatureEnabled(flagKey: string, userId?: string, userRole?: string): Promise<boolean>
getUserFeatureFlags(userId?: string, userRole?: string): Promise<Record<string, boolean>>

// User Preferences
getUserPreferences(userId: string): Promise<UserPreference | null>
updateUserPreferences(userId: string, updates: Partial<any>): Promise<UserPreference>

// Public Settings
getPublicSettings(): Promise<Record<string, any>>

// Audit
logConfigurationChange(entityType, entityId, action, options): Promise<void>

// Value Conversion
parseSettingValue(value: string, type: SettingType): any
stringifySettingValue(value: any, type: SettingType): string
```

---

## 🎨 UI Components

### Admin Components
- `SettingsManagementClient` - Full CRUD for system settings
- `FeatureFlagsClient` - Feature flag management interface

### User Components
- `UserPreferencesClient` - User preference customization

---

## 📊 Use Cases

### 1. Business Configuration
```javascript
// Set business hours
await setSystemSetting('business_start_hour', '08:00', 'STRING', {
  category: 'general',
  description: 'Business opening time'
});

// Set minimum lesson duration
await setSystemSetting('min_lesson_duration', 60, 'INTEGER', {
  category: 'lessons',
  description: 'Minimum lesson duration in minutes'
});
```

### 2. Feature Rollout
```javascript
// Enable new feature for 20% of users
await prisma.featureFlag.create({
  data: {
    flagKey: 'enable_video_lessons',
    flagName: 'Video Lessons',
    description: 'Allow instructors to upload video lessons',
    isEnabled: true,
    rolloutPercent: 20,
    category: 'features'
  }
});

// Later, increase rollout to 50%
await prisma.featureFlag.update({
  where: { flagKey: 'enable_video_lessons' },
  data: { rolloutPercent: 50 }
});
```

### 3. A/B Testing
```javascript
// Enable for specific roles only
await prisma.featureFlag.create({
  data: {
    flagKey: 'beta_dashboard',
    flagName: 'Beta Dashboard',
    isEnabled: true,
    rolloutPercent: 100,
    enabledForRoles: ['SUPER_ADMIN'], // Only admins see it
    category: 'ui'
  }
});
```

### 4. Emergency Feature Disable
```javascript
// Instantly disable a problematic feature
await prisma.featureFlag.update({
  where: { flagKey: 'problematic_feature' },
  data: { isEnabled: false }
});
// Takes effect immediately, no deployment needed!
```

---

## 🔒 Security & Access Control

### Admin-Only Operations
- Creating/updating/deleting system settings
- Managing feature flags
- Viewing configuration history

**All admin operations:**
- Require `SUPER_ADMIN` role
- Are logged in `ConfigurationHistory`
- Include audit trail (who, when, what changed)

### User Operations
- Viewing and updating own preferences
- Viewing public settings
- Checking feature flag status

---

## 🚀 Getting Started

### As an Admin

1. **Navigate to Settings:**
   - Go to `/admin/settings`
   - Use the tabs to switch between Settings and Feature Flags

2. **Create System Settings:**
   - Click "Add Setting"
   - Fill in the form
   - Choose appropriate type and category
   - Save

3. **Manage Feature Flags:**
   - Click "Add Feature Flag"
   - Configure rollout percentage
   - Target specific roles if needed
   - Toggle on/off as needed

### As a User

1. **Customize Preferences:**
   - Go to `/preferences`
   - Adjust settings across all categories
   - Changes save automatically
   - Preview changes instantly

### As a Developer

1. **Check Feature Flags:**
```typescript
const newFeatureEnabled = await isFeatureEnabled('my_feature', userId, userRole);
```

2. **Get Settings:**
```typescript
const maxDuration = await getSystemSetting<number>('max_lesson_duration');
```

3. **Get User Preferences:**
```typescript
const prefs = await getUserPreferences(userId);
const theme = prefs.theme;
```

---

## 📈 Benefits

1. **No Deployment Needed** - Change settings and toggle features instantly
2. **Safe Rollouts** - Gradually expose features to users
3. **Quick Rollback** - Disable features instantly if issues arise
4. **A/B Testing** - Test features with subset of users
5. **Personalization** - Users control their own experience
6. **Audit Trail** - Track all configuration changes
7. **Type Safety** - Strongly typed APIs and utilities
8. **Flexibility** - Five data types for different use cases

---

## 🎯 Best Practices

1. **Naming Conventions:**
   - Use lowercase with underscores: `enable_new_feature`
   - Be descriptive: `max_students_per_exam` not `max_students`

2. **Categories:**
   - Keep consistent: `general`, `lessons`, `notifications`, `exams`, `ui`, `api`

3. **Feature Flags:**
   - Start with low rollout percentage (10-20%)
   - Monitor for issues before increasing
   - Set expiration dates for temporary features
   - Clean up flags when features are fully rolled out

4. **Settings:**
   - Mark as public only if needed by frontend
   - Provide clear descriptions
   - Use appropriate data types

5. **User Preferences:**
   - Respect user choices
   - Provide sensible defaults
   - Don't override without permission

---

## 📝 Examples

### Example 1: Seasonal Feature
```typescript
// Enable holiday booking feature from Dec 1 to Jan 15
await prisma.featureFlag.create({
  data: {
    flagKey: 'holiday_booking_special',
    flagName: 'Holiday Booking Special',
    isEnabled: true,
    rolloutPercent: 100,
    expiresAt: new Date('2026-01-15')
  }
});
```

### Example 2: Beta Test Group
```typescript
// Enable for specific test users
await prisma.featureFlag.create({
  data: {
    flagKey: 'beta_mobile_app',
    flagName: 'Beta Mobile App',
    isEnabled: true,
    rolloutPercent: 100,
    enabledForUsers: ['user_id_1', 'user_id_2', 'user_id_3']
  }
});
```

### Example 3: Business Rules
```typescript
// Configure max students per exam
await setSystemSetting('max_students_per_exam', 2, 'INTEGER', {
  category: 'exams',
  description: 'Maximum number of students allowed in one exam session',
  isPublic: false
});

// Configure lesson reminder timing
await setSystemSetting('lesson_reminder_hours', 24, 'INTEGER', {
  category: 'notifications',
  description: 'Hours before lesson to send reminder notification',
  isPublic: false
});
```

---

## 🎉 Summary

Your platform now has **enterprise-grade configuration management** with:

✅ **Dynamic Settings** - Change behavior without code changes  
✅ **Feature Flags** - Safe feature rollouts and A/B testing  
✅ **User Preferences** - Personalized experience for every user  
✅ **Full APIs** - Programmatic access to all configuration  
✅ **Audit Trail** - Complete history of all changes  
✅ **Type Safety** - Strongly typed with validation  
✅ **Admin UI** - Beautiful, intuitive management interface  

**This is production-ready, scalable, and maintainable!** 🚀
