
// Translation system for the driving school platform
// Supports English (en) and Portuguese (pt)

export type Language = 'en' | 'pt';

export interface Translations {
  // Navigation
  nav: {
    signIn: string;
    getStarted: string;
    dashboard: string;
    profile: string;
    logout: string;
    admin: string;
    instructor: string;
    student: string;
  };
  
  // Landing Page
  landing: {
    title: string;
    subtitle: string;
    enrollAsStudent: string;
    joinAsInstructor: string;
    whyChooseUs: string;
    whyChooseUsSubtitle: string;
    readyToStart: string;
    readyToStartSubtitle: string;
    startLearningToday: string;
    alreadyHaveAccount: string;
  };
  
  // Features
  features: {
    flexibleScheduling: string;
    flexibleSchedulingDesc: string;
    certifiedInstructors: string;
    certifiedInstructorsDesc: string;
    modernFleet: string;
    modernFleetDesc: string;
    progressTracking: string;
    progressTrackingDesc: string;
    examPreparation: string;
    examPreparationDesc: string;
    safetyFirst: string;
    safetyFirstDesc: string;
  };
  
  // Registration
  register: {
    createAccount: string;
    fillDetails: string;
    iWantToRegisterAs: string;
    selectYourRole: string;
    student: string;
    instructor: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    address: string;
    city: string;
    postalCode: string;
    password: string;
    confirmPassword: string;
    createPassword: string;
    confirmYourPassword: string;
    studentInformation: string;
    instructorInformation: string;
    licenseCategories: string;
    transmissionType: string;
    selectTransmissionType: string;
    manual: string;
    automatic: string;
    instructorLicenseNumber: string;
    licenseExpiryDate: string;
    enterLicenseNumber: string;
    drivingSchool: string;
    selectDrivingSchool: string;
    agreeToTerms: string;
    and: string;
    privacyPolicy: string;
    termsAndConditions: string;
    createAccountButton: string;
    creatingAccount: string;
    alreadyHaveAccount: string;
    signInHere: string;
    enterFirstName: string;
    enterLastName: string;
    enterEmail: string;
    enterPhoneNumber: string;
    enterAddress: string;
    enterCity: string;
    enterPostalCode: string;
  };
  
  // Login
  login: {
    welcomeBack: string;
    signInToContinue: string;
    signInToAccount: string;
    email: string;
    password: string;
    enterEmail: string;
    enterPassword: string;
    rememberMe: string;
    forgotPassword: string;
    signIn: string;
    signingIn: string;
    noAccount: string;
    registerHere: string;
  };
  
  // Dashboard Common
  dashboard: {
    welcomeBack: string;
    upcomingLessons: string;
    completed: string;
    pendingRequests: string;
    progress: string;
    scheduledLessons: string;
    lessonsCompleted: string;
    awaitingApproval: string;
    courseCompletion: string;
    nextLesson: string;
    noUpcomingLessons: string;
    bookLesson: string;
    bookLessonExam: string;
    myLessons: string;
    viewProgress: string;
    recentLessons: string;
    latestCompleted: string;
    noCompletedLessons: string;
    lessonHistoryWillAppear: string;
  };
  
  // Student Dashboard
  student: {
    dashboard: string;
    welcomeMessage: string;
    scheduleNextLesson: string;
    viewAllLessonHistory: string;
    trackLearningJourney: string;
    progressOverview: string;
    overallProgress: string;
    category: string;
    transmission: string;
    drivingHours: string;
    theoryExam: string;
    practicalExam: string;
    passed: string;
    pending: string;
    notSelected: string;
    selectCategory: string;
    allCategories: string;
  };
  
  // Instructor Dashboard
  instructor: {
    dashboard: string;
    welcomeMessage: string;
    todaysLessons: string;
    scheduledForToday: string;
    thisMonth: string;
    totalStudents: string;
    studentsTaught: string;
    todaysSchedule: string;
    noLessonsToday: string;
    enjoyDayOff: string;
    performance: string;
    averageRating: string;
    successRate: string;
    totalLessons: string;
    experience: string;
    years: string;
    upcomingLessonsThisWeek: string;
    scheduleNext7Days: string;
    noUpcomingScheduled: string;
    newRequestsWillAppear: string;
  };
  
  // Admin Dashboard
  admin: {
    dashboard: string;
    welcomeMessage: string;
    totalStudents: string;
    activeEnrollments: string;
    instructors: string;
    certifiedInstructors: string;
    vehicles: string;
    activeVehicles: string;
    scheduledLessons: string;
    upcomingLessons: string;
    thisMonth: string;
    pendingRequests: string;
    unapprovedUsers: string;
    requiresAction: string;
    approvals: string;
    manageUsers: string;
    manageVehicles: string;
    manageLessons: string;
    settings: string;
  };
  
  // Booking
  booking: {
    bookLesson: string;
    bookExam: string;
    lessonType: string;
    selectLessonType: string;
    drivingLesson: string;
    theoryLesson: string;
    exam: string;
    category: string;
    selectCategory: string;
    instructor: string;
    selectInstructor: string;
    vehicle: string;
    selectVehicle: string;
    plate: string;
    date: string;
    selectDate: string;
    startTime: string;
    endTime: string;
    students: string;
    selectStudents: string;
    maxTwoStudents: string;
    notes: string;
    addNotes: string;
    book: string;
    booking: string;
    cancel: string;
  };
  
  // Validation Messages
  validation: {
    required: string;
    invalidEmail: string;
    invalidName: string;
    passwordMismatch: string;
    weakPassword: string;
    invalidPhoneNumber: string;
    selectAtLeastOne: string;
    selectDrivingSchool: string;
    acceptTerms: string;
  };
  
  // Common
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    refresh: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    close: string;
    confirm: string;
    yes: string;
    no: string;
    all: string;
    none: string;
    other: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      signIn: 'Sign In',
      getStarted: 'Get Started',
      dashboard: 'Dashboard',
      profile: 'Profile',
      logout: 'Logout',
      admin: 'Admin',
      instructor: 'Instructor',
      student: 'Student',
    },
    landing: {
      title: 'Learn to Drive with Confidence',
      subtitle: 'Professional driving lessons with certified instructors. Modern vehicles, flexible scheduling, and personalized instruction to help you succeed.',
      enrollAsStudent: 'Enroll as Student',
      joinAsInstructor: 'Join as Instructor',
      whyChooseUs: 'Why Choose Driving School Academy?',
      whyChooseUsSubtitle: 'Our comprehensive platform makes learning to drive easier, more convenient, and more effective than ever before.',
      readyToStart: 'Ready to Start Your Driving Journey?',
      readyToStartSubtitle: 'Join thousands of satisfied students who have successfully obtained their driving licenses with us.',
      startLearningToday: 'Start Learning Today',
      alreadyHaveAccount: 'Already have an account? Sign In',
    },
    features: {
      flexibleScheduling: 'Flexible Scheduling',
      flexibleSchedulingDesc: 'Book lessons at your convenience with our easy-to-use calendar system. Choose from daily, weekly, or monthly views.',
      certifiedInstructors: 'Certified Instructors',
      certifiedInstructorsDesc: 'Learn from experienced, certified instructors who specialize in different license categories and transmission types.',
      modernFleet: 'Modern Fleet',
      modernFleetDesc: 'Practice with our well-maintained fleet of vehicles including manual, automatic, and specialized category vehicles.',
      progressTracking: 'Progress Tracking',
      progressTrackingDesc: 'Monitor your learning progress with detailed lesson counters and performance analytics.',
      examPreparation: 'Exam Preparation',
      examPreparationDesc: 'Comprehensive theory and practical exam preparation with mock tests and personalized feedback.',
      safetyFirst: 'Safety First',
      safetyFirstDesc: 'All vehicles equipped with dual controls and safety features. Insurance coverage for peace of mind.',
    },
    register: {
      createAccount: 'Create Account',
      fillDetails: 'Please fill in your details to register',
      iWantToRegisterAs: 'I want to register as',
      selectYourRole: 'Select your role',
      student: 'Student',
      instructor: 'Instructor',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      dateOfBirth: 'Date of Birth',
      address: 'Address',
      city: 'City',
      postalCode: 'Postal Code',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      createPassword: 'Create a password',
      confirmYourPassword: 'Confirm your password',
      studentInformation: 'Student Information',
      instructorInformation: 'Instructor Information',
      licenseCategories: 'License Categories (select all that apply)',
      transmissionType: 'Transmission Type',
      selectTransmissionType: 'Select transmission type',
      manual: 'Manual',
      automatic: 'Automatic',
      instructorLicenseNumber: 'Instructor License Number',
      licenseExpiryDate: 'License Expiry Date',
      enterLicenseNumber: 'Enter license number',
      drivingSchool: 'Driving School',
      selectDrivingSchool: 'Select your driving school',
      agreeToTerms: 'I agree to the',
      and: 'and',
      privacyPolicy: 'Privacy Policy',
      termsAndConditions: 'Terms and Conditions',
      createAccountButton: 'Create Account',
      creatingAccount: 'Creating account...',
      alreadyHaveAccount: 'Already have an account?',
      signInHere: 'Sign in here',
      enterFirstName: 'Enter your first name',
      enterLastName: 'Enter your last name',
      enterEmail: 'Enter your email',
      enterPhoneNumber: 'Enter your phone number',
      enterAddress: 'Enter your address',
      enterCity: 'Enter your city',
      enterPostalCode: 'Enter postal code',
    },
    login: {
      welcomeBack: 'Welcome Back',
      signInToContinue: 'Sign in to your account to continue',
      signInToAccount: 'Sign in to your account',
      email: 'Email',
      password: 'Password',
      enterEmail: 'Enter your email',
      enterPassword: 'Enter your password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      noAccount: "Don't have an account?",
      registerHere: 'Register here',
    },
    dashboard: {
      welcomeBack: 'Welcome back',
      upcomingLessons: 'Upcoming Lessons',
      completed: 'Completed',
      pendingRequests: 'Pending Requests',
      progress: 'Progress',
      scheduledLessons: 'Scheduled lessons',
      lessonsCompleted: 'Lessons completed',
      awaitingApproval: 'Awaiting approval',
      courseCompletion: 'Course completion',
      nextLesson: 'Next Lesson',
      noUpcomingLessons: 'No upcoming lessons scheduled',
      bookLesson: 'Book a Lesson',
      bookLessonExam: 'Book Lesson/Exam',
      myLessons: 'My Lessons',
      viewProgress: 'View Progress',
      recentLessons: 'Recent Lessons',
      latestCompleted: 'Your latest completed lessons',
      noCompletedLessons: 'No completed lessons yet',
      lessonHistoryWillAppear: 'Your lesson history will appear here',
    },
    student: {
      dashboard: 'Student Dashboard',
      welcomeMessage: 'Track your learning progress and manage your lessons.',
      scheduleNextLesson: 'Schedule your next driving lesson',
      viewAllLessonHistory: 'View all your lesson history',
      trackLearningJourney: 'Track your learning journey',
      progressOverview: 'Progress Overview',
      overallProgress: 'Overall Progress',
      category: 'Category',
      transmission: 'Transmission',
      drivingHours: 'Driving Hours',
      theoryExam: 'Theory Exam',
      practicalExam: 'Practical Exam',
      passed: 'Passed',
      pending: 'Pending',
      notSelected: 'Not selected',
      selectCategory: 'Select Category',
      allCategories: 'All Categories',
    },
    instructor: {
      dashboard: 'Instructor Dashboard',
      welcomeMessage: "Here's your teaching schedule and performance.",
      todaysLessons: "Today's Lessons",
      scheduledForToday: 'Scheduled for today',
      thisMonth: 'This Month',
      totalStudents: 'Total Students',
      studentsTaught: 'Students taught',
      todaysSchedule: "Today's Schedule",
      noLessonsToday: 'No lessons scheduled for today',
      enjoyDayOff: 'Enjoy your day off!',
      performance: 'Performance',
      averageRating: 'Average Rating',
      successRate: 'Success Rate',
      totalLessons: 'Total Lessons',
      experience: 'Experience',
      years: 'years',
      upcomingLessonsThisWeek: 'Upcoming Lessons This Week',
      scheduleNext7Days: 'Your schedule for the next 7 days',
      noUpcomingScheduled: 'No upcoming lessons scheduled',
      newRequestsWillAppear: 'New lesson requests will appear here',
    },
    admin: {
      dashboard: 'Admin Dashboard',
      welcomeMessage: "Here's your driving school overview.",
      totalStudents: 'Total Students',
      activeEnrollments: 'Active enrollments',
      instructors: 'Instructors',
      certifiedInstructors: 'Certified instructors',
      vehicles: 'Vehicles',
      activeVehicles: 'Active vehicles',
      scheduledLessons: 'Scheduled Lessons',
      upcomingLessons: 'Upcoming lessons',
      thisMonth: 'This Month',
      pendingRequests: 'Pending Requests',
      unapprovedUsers: 'Unapproved Users',
      requiresAction: 'Requires action',
      approvals: 'Approvals',
      manageUsers: 'Manage Users',
      manageVehicles: 'Manage Vehicles',
      manageLessons: 'Manage Lessons',
      settings: 'Settings',
    },
    booking: {
      bookLesson: 'Book Lesson',
      bookExam: 'Book Exam',
      lessonType: 'Lesson Type',
      selectLessonType: 'Select lesson type',
      drivingLesson: 'Driving Lesson',
      theoryLesson: 'Theory Lesson',
      exam: 'Exam',
      category: 'Category',
      selectCategory: 'Select category',
      instructor: 'Instructor',
      selectInstructor: 'Select instructor',
      vehicle: 'Vehicle',
      selectVehicle: 'Select vehicle',
      plate: 'Plate',
      date: 'Date',
      selectDate: 'Select date',
      startTime: 'Start Time',
      endTime: 'End Time',
      students: 'Students',
      selectStudents: 'Select students',
      maxTwoStudents: 'Maximum 2 students for exams',
      notes: 'Notes',
      addNotes: 'Add any additional notes',
      book: 'Book',
      booking: 'Booking...',
      cancel: 'Cancel',
    },
    validation: {
      required: 'This field is required',
      invalidEmail: 'Please enter a valid email address',
      invalidName: 'Name cannot contain numbers or special characters',
      passwordMismatch: 'Passwords do not match',
      weakPassword: 'Password must contain at least 8 characters, 1 uppercase letter, 1 special character, and 1 number',
      invalidPhoneNumber: 'Please enter a valid phone number',
      selectAtLeastOne: 'Please select at least one category',
      selectDrivingSchool: 'Please select your driving school',
      acceptTerms: 'Please accept the terms and conditions',
    },
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      close: 'Close',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      all: 'All',
      none: 'None',
      other: 'Other',
    },
  },
  pt: {
    nav: {
      signIn: 'Entrar',
      getStarted: 'Começar',
      dashboard: 'Painel',
      profile: 'Perfil',
      logout: 'Sair',
      admin: 'Administrador',
      instructor: 'Instrutor',
      student: 'Aluno',
    },
    landing: {
      title: 'Aprenda a Conduzir com Confiança',
      subtitle: 'Aulas de condução profissionais com instrutores certificados. Veículos modernos, horários flexíveis e instrução personalizada para o ajudar a ter sucesso.',
      enrollAsStudent: 'Inscrever como Aluno',
      joinAsInstructor: 'Juntar como Instrutor',
      whyChooseUs: 'Porque Escolher a Driving School Academy?',
      whyChooseUsSubtitle: 'A nossa plataforma abrangente torna aprender a conduzir mais fácil, mais conveniente e mais eficaz do que nunca.',
      readyToStart: 'Pronto para Começar a Sua Jornada de Condução?',
      readyToStartSubtitle: 'Junte-se a milhares de alunos satisfeitos que obtiveram com sucesso as suas cartas de condução connosco.',
      startLearningToday: 'Comece a Aprender Hoje',
      alreadyHaveAccount: 'Já tem uma conta? Entrar',
    },
    features: {
      flexibleScheduling: 'Agendamento Flexível',
      flexibleSchedulingDesc: 'Marque aulas quando for conveniente com o nosso sistema de calendário fácil de usar. Escolha entre vistas diárias, semanais ou mensais.',
      certifiedInstructors: 'Instrutores Certificados',
      certifiedInstructorsDesc: 'Aprenda com instrutores experientes e certificados que se especializam em diferentes categorias de carta e tipos de transmissão.',
      modernFleet: 'Frota Moderna',
      modernFleetDesc: 'Pratique com a nossa frota bem mantida de veículos, incluindo manuais, automáticos e veículos de categorias especializadas.',
      progressTracking: 'Acompanhamento de Progresso',
      progressTrackingDesc: 'Monitorize o seu progresso de aprendizagem com contadores de aulas detalhados e análises de desempenho.',
      examPreparation: 'Preparação para Exames',
      examPreparationDesc: 'Preparação abrangente para exames teóricos e práticos com testes simulados e feedback personalizado.',
      safetyFirst: 'Segurança em Primeiro',
      safetyFirstDesc: 'Todos os veículos equipados com controlos duplos e recursos de segurança. Cobertura de seguro para sua tranquilidade.',
    },
    register: {
      createAccount: 'Criar Conta',
      fillDetails: 'Por favor, preencha os seus dados para se registar',
      iWantToRegisterAs: 'Quero registar-me como',
      selectYourRole: 'Selecione o seu papel',
      student: 'Aluno',
      instructor: 'Instrutor',
      firstName: 'Primeiro Nome',
      lastName: 'Último Nome',
      email: 'Email',
      phoneNumber: 'Número de Telefone',
      dateOfBirth: 'Data de Nascimento',
      address: 'Morada',
      city: 'Cidade',
      postalCode: 'Código Postal',
      password: 'Palavra-passe',
      confirmPassword: 'Confirmar Palavra-passe',
      createPassword: 'Crie uma palavra-passe',
      confirmYourPassword: 'Confirme a sua palavra-passe',
      studentInformation: 'Informação do Aluno',
      instructorInformation: 'Informação do Instrutor',
      licenseCategories: 'Categorias de Carta (selecione todas as aplicáveis)',
      transmissionType: 'Tipo de Transmissão',
      selectTransmissionType: 'Selecione o tipo de transmissão',
      manual: 'Manual',
      automatic: 'Automático',
      instructorLicenseNumber: 'Número de Licença de Instrutor',
      licenseExpiryDate: 'Data de Validade da Licença',
      enterLicenseNumber: 'Introduza o número da licença',
      drivingSchool: 'Escola de Condução',
      selectDrivingSchool: 'Selecione a sua escola de condução',
      agreeToTerms: 'Concordo com os',
      and: 'e',
      privacyPolicy: 'Política de Privacidade',
      termsAndConditions: 'Termos e Condições',
      createAccountButton: 'Criar Conta',
      creatingAccount: 'A criar conta...',
      alreadyHaveAccount: 'Já tem uma conta?',
      signInHere: 'Entre aqui',
      enterFirstName: 'Introduza o seu primeiro nome',
      enterLastName: 'Introduza o seu último nome',
      enterEmail: 'Introduza o seu email',
      enterPhoneNumber: 'Introduza o seu número de telefone',
      enterAddress: 'Introduza a sua morada',
      enterCity: 'Introduza a sua cidade',
      enterPostalCode: 'Introduza o código postal',
    },
    login: {
      welcomeBack: 'Bem-vindo de Volta',
      signInToContinue: 'Entre na sua conta para continuar',
      signInToAccount: 'Entre na sua conta',
      email: 'Email',
      password: 'Palavra-passe',
      enterEmail: 'Introduza o seu email',
      enterPassword: 'Introduza a sua palavra-passe',
      rememberMe: 'Lembrar-me',
      forgotPassword: 'Esqueceu a palavra-passe?',
      signIn: 'Entrar',
      signingIn: 'A entrar...',
      noAccount: 'Não tem uma conta?',
      registerHere: 'Registe-se aqui',
    },
    dashboard: {
      welcomeBack: 'Bem-vindo de volta',
      upcomingLessons: 'Aulas Futuras',
      completed: 'Concluídas',
      pendingRequests: 'Pedidos Pendentes',
      progress: 'Progresso',
      scheduledLessons: 'Aulas agendadas',
      lessonsCompleted: 'Aulas concluídas',
      awaitingApproval: 'Aguardando aprovação',
      courseCompletion: 'Conclusão do curso',
      nextLesson: 'Próxima Aula',
      noUpcomingLessons: 'Não há aulas futuras agendadas',
      bookLesson: 'Marcar uma Aula',
      bookLessonExam: 'Marcar Aula/Exame',
      myLessons: 'Minhas Aulas',
      viewProgress: 'Ver Progresso',
      recentLessons: 'Aulas Recentes',
      latestCompleted: 'As suas últimas aulas concluídas',
      noCompletedLessons: 'Ainda não há aulas concluídas',
      lessonHistoryWillAppear: 'O seu histórico de aulas aparecerá aqui',
    },
    student: {
      dashboard: 'Painel do Aluno',
      welcomeMessage: 'Acompanhe o seu progresso de aprendizagem e gerencie as suas aulas.',
      scheduleNextLesson: 'Agende a sua próxima aula de condução',
      viewAllLessonHistory: 'Veja todo o seu histórico de aulas',
      trackLearningJourney: 'Acompanhe a sua jornada de aprendizagem',
      progressOverview: 'Visão Geral do Progresso',
      overallProgress: 'Progresso Geral',
      category: 'Categoria',
      transmission: 'Transmissão',
      drivingHours: 'Horas de Condução',
      theoryExam: 'Exame Teórico',
      practicalExam: 'Exame Prático',
      passed: 'Aprovado',
      pending: 'Pendente',
      notSelected: 'Não selecionado',
      selectCategory: 'Selecionar Categoria',
      allCategories: 'Todas as Categorias',
    },
    instructor: {
      dashboard: 'Painel do Instrutor',
      welcomeMessage: 'Aqui está o seu horário de ensino e desempenho.',
      todaysLessons: 'Aulas de Hoje',
      scheduledForToday: 'Agendadas para hoje',
      thisMonth: 'Este Mês',
      totalStudents: 'Total de Alunos',
      studentsTaught: 'Alunos ensinados',
      todaysSchedule: 'Horário de Hoje',
      noLessonsToday: 'Não há aulas agendadas para hoje',
      enjoyDayOff: 'Aproveite o seu dia de folga!',
      performance: 'Desempenho',
      averageRating: 'Avaliação Média',
      successRate: 'Taxa de Sucesso',
      totalLessons: 'Total de Aulas',
      experience: 'Experiência',
      years: 'anos',
      upcomingLessonsThisWeek: 'Aulas Futuras Esta Semana',
      scheduleNext7Days: 'O seu horário para os próximos 7 dias',
      noUpcomingScheduled: 'Não há aulas futuras agendadas',
      newRequestsWillAppear: 'Novos pedidos de aulas aparecerão aqui',
    },
    admin: {
      dashboard: 'Painel do Administrador',
      welcomeMessage: 'Aqui está a visão geral da sua escola de condução.',
      totalStudents: 'Total de Alunos',
      activeEnrollments: 'Inscrições ativas',
      instructors: 'Instrutores',
      certifiedInstructors: 'Instrutores certificados',
      vehicles: 'Veículos',
      activeVehicles: 'Veículos ativos',
      scheduledLessons: 'Aulas Agendadas',
      upcomingLessons: 'Aulas futuras',
      thisMonth: 'Este Mês',
      pendingRequests: 'Pedidos Pendentes',
      unapprovedUsers: 'Utilizadores Não Aprovados',
      requiresAction: 'Requer ação',
      approvals: 'Aprovações',
      manageUsers: 'Gerir Utilizadores',
      manageVehicles: 'Gerir Veículos',
      manageLessons: 'Gerir Aulas',
      settings: 'Definições',
    },
    booking: {
      bookLesson: 'Marcar Aula',
      bookExam: 'Marcar Exame',
      lessonType: 'Tipo de Aula',
      selectLessonType: 'Selecione o tipo de aula',
      drivingLesson: 'Aula de Condução',
      theoryLesson: 'Aula Teórica',
      exam: 'Exame',
      category: 'Categoria',
      selectCategory: 'Selecione a categoria',
      instructor: 'Instrutor',
      selectInstructor: 'Selecione o instrutor',
      vehicle: 'Veículo',
      selectVehicle: 'Selecione o veículo',
      plate: 'Matrícula',
      date: 'Data',
      selectDate: 'Selecione a data',
      startTime: 'Hora de Início',
      endTime: 'Hora de Fim',
      students: 'Alunos',
      selectStudents: 'Selecione os alunos',
      maxTwoStudents: 'Máximo 2 alunos para exames',
      notes: 'Notas',
      addNotes: 'Adicione quaisquer notas adicionais',
      book: 'Marcar',
      booking: 'A marcar...',
      cancel: 'Cancelar',
    },
    validation: {
      required: 'Este campo é obrigatório',
      invalidEmail: 'Por favor, introduza um endereço de email válido',
      invalidName: 'O nome não pode conter números ou caracteres especiais',
      passwordMismatch: 'As palavras-passe não correspondem',
      weakPassword: 'A palavra-passe deve conter pelo menos 8 caracteres, 1 letra maiúscula, 1 caractere especial e 1 número',
      invalidPhoneNumber: 'Por favor, introduza um número de telefone válido',
      selectAtLeastOne: 'Por favor, selecione pelo menos uma categoria',
      selectDrivingSchool: 'Por favor, selecione a sua escola de condução',
      acceptTerms: 'Por favor, aceite os termos e condições',
    },
    common: {
      loading: 'A carregar...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      view: 'Ver',
      search: 'Pesquisar',
      filter: 'Filtrar',
      export: 'Exportar',
      import: 'Importar',
      refresh: 'Atualizar',
      back: 'Voltar',
      next: 'Próximo',
      previous: 'Anterior',
      submit: 'Submeter',
      close: 'Fechar',
      confirm: 'Confirmar',
      yes: 'Sim',
      no: 'Não',
      all: 'Todos',
      none: 'Nenhum',
      other: 'Outro',
    },
  },
};

export function getTranslation(language: Language): Translations {
  return translations[language] || translations.en;
}
