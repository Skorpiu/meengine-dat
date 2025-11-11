'use client';

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, UserPlus, Car } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSelector } from "@/components/language-selector"

const CATEGORIES = [
  "AM", "A1", "A2", "A", "B1", "B", "C1", "C", "D1", "D", "B+E", "C+E", "C1+E", "D+E", "D1+E"
]

const DRIVING_SCHOOLS = [
  { id: "1", name: "Driving School Academy - Lisbon" },
  { id: "2", name: "Driving School Academy - Porto" },
  { id: "3", name: "Driving School Academy - Faro" },
  { id: "4", name: "Driving School Academy - Coimbra" },
]

const COUNTRY_CODES = [
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
]

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  
  // Pre-select role based on URL parameter
  const roleParam = searchParams?.get('role')
  const initialRole = roleParam === 'student' ? 'STUDENT' : roleParam === 'instructor' ? 'INSTRUCTOR' : ''
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+351",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    role: initialRole,
    dateOfBirth: "",
    address: "",
    city: "",
    postalCode: "",
    drivingSchoolId: "",
  })
  
  // Student-specific fields
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [transmissionType, setTransmissionType] = useState("")
  
  // Instructor-specific fields
  const [instructorLicenseNumber, setInstructorLicenseNumber] = useState("")
  const [instructorLicenseExpiry, setInstructorLicenseExpiry] = useState("")
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Validation functions
  const validateName = (name: string): boolean => {
    const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/
    return nameRegex.test(name)
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string): boolean => {
    // At least 8 chars, 1 uppercase, 1 special char, 1 number
    const hasLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const hasNumber = /\d/.test(password)
    return hasLength && hasUppercase && hasSpecialChar && hasNumber
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setValidationErrors({})
    
    const errors: Record<string, string> = {}

    // Name validation
    if (!validateName(formData.firstName)) {
      errors.firstName = t.validation.invalidName
    }
    
    if (!validateName(formData.lastName)) {
      errors.lastName = t.validation.invalidName
    }

    // Email validation
    if (!validateEmail(formData.email)) {
      errors.email = t.validation.invalidEmail
    }

    // Password validation
    if (!validatePassword(formData.password)) {
      errors.password = t.validation.weakPassword
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t.validation.passwordMismatch
    }

    if (!acceptTerms) {
      errors.terms = t.validation.acceptTerms
    }

    // Driving school validation
    if (!formData.drivingSchoolId) {
      errors.drivingSchoolId = t.validation.selectDrivingSchool
    }

    // Role-specific validations
    if (formData.role === "STUDENT") {
      if (selectedCategories.length === 0) {
        errors.categories = t.validation.selectAtLeastOne
      }
      if (!transmissionType) {
        errors.transmissionType = t.validation.required
      }
    }

    if (formData.role === "INSTRUCTOR") {
      if (!instructorLicenseNumber || !instructorLicenseExpiry) {
        errors.instructorLicense = t.validation.required
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setError("Please fix the validation errors")
      setIsLoading(false)
      return
    }

    try {
      const registrationData = {
        ...formData,
        phoneNumber: `${formData.countryCode}${formData.phoneNumber}`,
        email: formData.email.toLowerCase(),
        ...(formData.role === "STUDENT" && {
          selectedCategories,
          transmissionType,
        }),
        ...(formData.role === "INSTRUCTOR" && {
          instructorLicenseNumber,
          instructorLicenseExpiry,
        }),
      }

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      })

      const data = await response.json()

      if (response.ok) {
        // Registration successful, redirect to login with success message
        router.push(`/auth/login?message=${encodeURIComponent("Registration successful! Please check your email for verification instructions.")}`)
      } else {
        setError(data.error || "Registration failed")
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo, Header and Language Selector */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-4">
            <div className="bg-driving-primary rounded-full p-4">
              <Car className="w-8 h-8 text-white" />
            </div>
            <LanguageSelector />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t.landing.title.split(' ')[0]} Driving School Academy</h1>
            <p className="text-gray-600 mt-2">{t.register.fillDetails}</p>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="shadow-lg border-0 hover-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">{t.register.createAccount}</CardTitle>
            <CardDescription className="text-center">
              {t.register.fillDetails}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">{t.register.iWantToRegisterAs}</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange("role", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t.register.selectYourRole} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">{t.register.student}</SelectItem>
                    <SelectItem value="INSTRUCTOR">{t.register.instructor}</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.role && (
                  <p className="text-sm text-red-600">{validationErrors.role}</p>
                )}
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t.register.firstName}</Label>
                  <Input
                    id="firstName"
                    placeholder={t.register.enterFirstName}
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                    className="h-11"
                  />
                  {validationErrors.firstName && (
                    <p className="text-sm text-red-600">{validationErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t.register.lastName}</Label>
                  <Input
                    id="lastName"
                    placeholder={t.register.enterLastName}
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                    className="h-11"
                  />
                  {validationErrors.lastName && (
                    <p className="text-sm text-red-600">{validationErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">{t.register.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.register.enterEmail}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  className="h-11"
                />
                {validationErrors.email && (
                  <p className="text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>

              {/* Phone Number with Country Code */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t.register.phoneNumber}</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.countryCode}
                    onValueChange={(value) => handleInputChange("countryCode", value)}
                  >
                    <SelectTrigger className="h-11 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder={t.register.enterPhoneNumber}
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    required
                    className="h-11 flex-1"
                  />
                </div>
                {validationErrors.phoneNumber && (
                  <p className="text-sm text-red-600">{validationErrors.phoneNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">{t.register.dateOfBirth}</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">{t.register.address}</Label>
                  <Input
                    id="address"
                    placeholder={t.register.enterAddress}
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t.register.city}</Label>
                    <Input
                      id="city"
                      placeholder={t.register.enterCity}
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">{t.register.postalCode}</Label>
                    <Input
                      id="postalCode"
                      placeholder={t.register.enterPostalCode}
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange("postalCode", e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Driving School Selection */}
              <div className="space-y-2">
                <Label htmlFor="drivingSchool">{t.register.drivingSchool}</Label>
                <Select
                  value={formData.drivingSchoolId}
                  onValueChange={(value) => handleInputChange("drivingSchoolId", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t.register.selectDrivingSchool} />
                  </SelectTrigger>
                  <SelectContent>
                    {DRIVING_SCHOOLS.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.drivingSchoolId && (
                  <p className="text-sm text-red-600">{validationErrors.drivingSchoolId}</p>
                )}
              </div>

              {/* Role-specific fields */}
              {formData.role === "STUDENT" && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900">{t.register.studentInformation}</h3>
                  
                  <div className="space-y-2">
                    <Label>{t.register.licenseCategories}</Label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {CATEGORIES.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={category}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={() => handleCategoryToggle(category)}
                          />
                          <Label htmlFor={category} className="text-sm font-medium">
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {validationErrors.categories && (
                      <p className="text-sm text-red-600">{validationErrors.categories}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transmissionType">{t.register.transmissionType}</Label>
                    <Select
                      value={transmissionType}
                      onValueChange={setTransmissionType}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t.register.selectTransmissionType} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">{t.register.manual}</SelectItem>
                        <SelectItem value="Automatic">{t.register.automatic}</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.transmissionType && (
                      <p className="text-sm text-red-600">{validationErrors.transmissionType}</p>
                    )}
                  </div>
                </div>
              )}

              {formData.role === "INSTRUCTOR" && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-900">{t.register.instructorInformation}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instructorLicenseNumber">{t.register.instructorLicenseNumber}</Label>
                      <Input
                        id="instructorLicenseNumber"
                        placeholder={t.register.enterLicenseNumber}
                        value={instructorLicenseNumber}
                        onChange={(e) => setInstructorLicenseNumber(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instructorLicenseExpiry">{t.register.licenseExpiryDate}</Label>
                      <Input
                        id="instructorLicenseExpiry"
                        type="date"
                        value={instructorLicenseExpiry}
                        onChange={(e) => setInstructorLicenseExpiry(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                  </div>
                  {validationErrors.instructorLicense && (
                    <p className="text-sm text-red-600">{validationErrors.instructorLicense}</p>
                  )}
                </div>
              )}

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t.register.password}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.register.createPassword}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-sm text-red-600">{validationErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.register.confirmPassword}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t.register.confirmYourPassword}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="text-sm text-red-600">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm leading-normal">
                  {t.register.agreeToTerms}{" "}
                  <Link href="#" className="text-driving-primary hover:underline">
                    {t.register.termsAndConditions}
                  </Link>{" "}
                  {t.register.and}{" "}
                  <Link href="#" className="text-driving-primary hover:underline">
                    {t.register.privacyPolicy}
                  </Link>
                </Label>
              </div>
              {validationErrors.terms && (
                <p className="text-sm text-red-600">{validationErrors.terms}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-driving-primary hover:bg-driving-primary/90 hover-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loading-spinner w-4 h-4 mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {isLoading ? t.register.creatingAccount : t.register.createAccountButton}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t.register.alreadyHaveAccount}{" "}
                <Link
                  href="/auth/login"
                  className="font-medium text-driving-primary hover:underline"
                >
                  {t.register.signInHere}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
