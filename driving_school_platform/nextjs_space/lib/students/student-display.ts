export type StudentDisplaySource = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  schoolStudentId?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

function joinNameParts(first?: string | null, last?: string | null): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ");
}

export function getStudentDisplayName(
  student?: StudentDisplaySource | null,
): string {
  if (!student) return "Student";

  const operationalName = joinNameParts(student.firstName, student.lastName);
  if (operationalName) return operationalName;

  const userName = joinNameParts(
    student.user?.firstName,
    student.user?.lastName,
  );
  if (userName) return userName;

  const schoolId = student.schoolStudentId?.trim();
  if (schoolId) return schoolId;

  return "Student";
}

export function getStudentDisplayEmail(
  student?: StudentDisplaySource | null,
): string | null {
  if (!student) return null;

  const operationalEmail = student.email?.trim();
  if (operationalEmail) return operationalEmail;

  const userEmail = student.user?.email?.trim();
  return userEmail || null;
}

export function getStudentDisplayLabel(
  student?: StudentDisplaySource | null,
): string {
  const name = getStudentDisplayName(student);
  const schoolId = student?.schoolStudentId?.trim();
  if (schoolId && name !== schoolId) {
    return `${schoolId} — ${name}`;
  }
  return name;
}
