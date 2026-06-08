import { getPeopleProfileInitials } from "@/lib/people/people-profile-initials";
import { cn } from "@/lib/utils";

type PeopleProfileAvatarProps = {
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
};

export function PeopleProfileAvatar({
  firstName,
  lastName,
  className,
}: PeopleProfileAvatarProps) {
  return (
    <div
      className={cn(
        "w-12 h-12 shrink-0 rounded-full bg-driving-primary text-white flex items-center justify-center font-medium",
        className,
      )}
      aria-hidden
    >
      {getPeopleProfileInitials(firstName, lastName)}
    </div>
  );
}
