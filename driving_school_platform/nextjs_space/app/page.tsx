'use client';

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, Users, Calendar, Award, Clock, Shield } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"
import { LanguageSelector } from "@/components/language-selector"
import { getDrivingSchoolName } from "@/lib/config/features"

export default function HomePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const drivingSchoolName = getDrivingSchoolName();

  useEffect(() => {
    if (status !== 'loading') {
      setIsLoading(false);
      // Redirect logged-in users to their dashboard
      if (session?.user) {
        if (session.user.role === "SUPER_ADMIN") {
          router.push("/admin");
        } else if (session.user.role === "INSTRUCTOR") {
          router.push("/instructor");
        } else if (session.user.role === "STUDENT") {
          router.push("/student");
        }
      }
    }
  }, [session, status, router]);

  if (isLoading || (status !== 'loading' && session?.user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-driving-primary rounded-full p-2">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{drivingSchoolName}</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <Link href="/auth/login">
                <Button className="bg-driving-primary hover:bg-driving-primary/90 hover-button">
                  {t.nav.signIn}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6 animate-fade-in">
              Learn to Drive with <span className="text-driving-primary">Driving School Academy</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-slide-up">
              {t.landing.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
              <Link href="/auth/login">
                <Button size="lg" className="bg-driving-primary hover:bg-driving-primary/90 hover-button px-8 py-3 text-lg">
                  <Users className="w-5 h-5 mr-2" />
                  Sign In to Access Platform
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 mt-6">
              New users? Visit our office to register and get your account created by our staff.
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.landing.whyChooseUs}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.landing.whyChooseUsSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover-card border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-driving-primary" />
                </div>
                <CardTitle className="text-xl">{t.features.flexibleScheduling}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  {t.features.flexibleSchedulingDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-card border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">{t.features.certifiedInstructors}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  {t.features.certifiedInstructorsDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-card border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-driving-secondary" />
                </div>
                <CardTitle className="text-xl">{t.features.modernFleet}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  {t.features.modernFleetDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-card border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="bg-purple-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl">{t.features.progressTracking}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  {t.features.progressTrackingDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-card border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="bg-orange-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl">{t.features.examPreparation}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  {t.features.examPreparationDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-card border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="bg-indigo-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">{t.features.safetyFirst}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  {t.features.safetyFirstDesc}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* License Categories Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">License Categories We Offer</h2>
            <p className="text-lg text-gray-600">
              From motorcycles to buses, we cover all major driving license categories.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-8 gap-4">
            {["AM", "A1", "A2", "A", "B1", "B", "C1", "C", "D1", "D", "B+E", "C+E", "C1+E", "D+E", "D1+E"].map((category) => (
              <div
                key={category}
                className="bg-white rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="bg-driving-primary text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-sm">{category}</span>
                </div>
                <p className="text-sm text-gray-600 font-medium">{category}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-red-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">{t.landing.readyToStart}</h2>
          <p className="text-xl text-blue-100 mb-8">
            Visit our office to register and start your driving journey today
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 hover-button px-8 py-3">
                {t.landing.alreadyHaveAccount}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-driving-primary rounded-full p-2">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{drivingSchoolName}</h3>
              </div>
              <p className="text-gray-400">
                Professional driving education with modern facilities and experienced instructors.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2">
                <li>📧 info@{drivingSchoolName.toLowerCase().replace(/\s+/g, '')}.com</li>
                <li>📞 +351-XXX-XXX-XXX</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Categories</h4>
              <p className="text-gray-400">
                AM, A1, A2, A, B1, B, C1, C, D1, D, B+E, C+E, C1+E, D+E, D1+E
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">© 2025 {drivingSchoolName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
