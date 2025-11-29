import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navigation/navbar';
import { EditLessonClient } from './EditLessonClient';

export const dynamic = 'force-dynamic';

interface EditLessonPageProps {
  params: {
    id: string;
  };
}

export default async function EditLessonPage({ params }: EditLessonPageProps) {
  const session = await getServerSession(authOptions);

  // Only SUPER_ADMIN and INSTRUCTOR can edit lessons
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'INSTRUCTOR')) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <EditLessonClient lessonId={params.id} userRole={session.user.role} userId={session.user.id} />
      </main>
    </div>
  );
}
