"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserPlus, Trash2, CheckCircle, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { InvitationsManagementClient } from "@/components/admin/invitations-management-client";
import { StudentRecordsManager } from "@/components/admin/student-records-manager";

async function tryReadJson<T = unknown>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type CategoryOption = {
  id: number;
  name: string;
};

type TransmissionTypeOption = {
  id: number;
  name: string;
};

type StudentInfo = {
  category?: { name: string } | null;
  transmissionType?: { name: string } | null;
};

type InstructorInfo = {
  instructorLicenseNumber?: string | null;
  instructorLicenseExpiry?: string | Date | null;
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  address: string | null;
  role: string;
  isApproved: boolean;
  createdAt: Date;
  student?: StudentInfo | null;
  instructor?: InstructorInfo | null;
}

interface Props {
  users: User[];
  stats: {
    totalStudents: number;
    totalInstructors: number;
    totalUsers: number;
  };
  categories: CategoryOption[];
  transmissionTypes: TransmissionTypeOption[];
}

export function UsersManagementClient({
  users,
  stats,
  categories,
  transmissionTypes,
}: Props) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    countryCode: "+351",
    address: "",
    role: "STUDENT",
    selectedCategories: [] as string[],
    transmissionType: "",
    instructorLicenseNumber: "",
    instructorLicenseExpiry: "",
  });

  const validateName = (name: string) => {
    return /^[A-Za-zÀ-ÿ\s'-]+$/.test(name);
  };

  const handleCreateUser = async () => {
    // Validation
    if (!validateName(formData.firstName)) {
      toast.error("First name can only contain letters");
      return;
    }
    if (!validateName(formData.lastName)) {
      toast.error("Last name can only contain letters");
      return;
    }
    if (
      formData.role === "STUDENT" &&
      formData.selectedCategories.length === 0
    ) {
      toast.error("Please select at least one license category");
      return;
    }

    setIsLoading(true);

    try {
      const fullPhoneNumber = formData.phoneNumber
        ? `${formData.countryCode}${formData.phoneNumber}`
        : "";

      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phoneNumber: fullPhoneNumber,
        }),
      });

      const data = await tryReadJson<{ tempPassword?: string; error?: string }>(
        response,
      );

      if (response.ok) {
        if (data?.tempPassword) {
          toast.success(
            `User created! Temporary password: ${data.tempPassword}`,
          );
        } else {
          toast.success("User created successfully.");
        }
        setIsCreateDialogOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(data?.error || "Failed to create user");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    // Validation
    if (!validateName(formData.firstName)) {
      toast.error("First name can only contain letters");
      return;
    }
    if (!validateName(formData.lastName)) {
      toast.error("Last name can only contain letters");
      return;
    }

    setIsLoading(true);

    try {
      const fullPhoneNumber = formData.phoneNumber
        ? `${formData.countryCode}${formData.phoneNumber}`
        : "";

      const response = await fetch("/api/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          ...formData,
          phoneNumber: fullPhoneNumber,
        }),
      });

      const data = await tryReadJson<{ error?: string }>(response);

      if (response.ok) {
        toast.success("User updated successfully");
        setIsEditDialogOpen(false);
        setEditingUser(null);
        resetForm();
        router.refresh();
      } else {
        toast.error(data?.error || "Failed to update user");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);

    // Parse phone number to extract country code
    let countryCode = "+351";
    let phoneNumber = user.phoneNumber || "";
    if (phoneNumber) {
      const codes = ["+351", "+44", "+1", "+34", "+33", "+49"];
      const foundCode = codes.find((code) => phoneNumber.startsWith(code));
      if (foundCode) {
        countryCode = foundCode;
        phoneNumber = phoneNumber.slice(foundCode.length);
      }
    }

    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber,
      countryCode,
      address: user.address || "",
      role: user.role,
      selectedCategories: user.student?.category
        ? [user.student.category.name]
        : [],
      transmissionType: user.student?.transmissionType?.name || "",
      instructorLicenseNumber: user.instructor?.instructorLicenseNumber || "",
      instructorLicenseExpiry: user.instructor?.instructorLicenseExpiry
        ? new Date(user.instructor.instructorLicenseExpiry)
            .toISOString()
            .split("T")[0]
        : "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      countryCode: "+351",
      address: "",
      role: "STUDENT",
      selectedCategories: [],
      transmissionType: "",
      instructorLicenseNumber: "",
      instructorLicenseExpiry: "",
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/users/delete?userId=${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        },
      );

      const data = await tryReadJson<{ message?: string; error?: string }>(
        response,
      );

      if (response.ok) {
        toast.success(data?.message || "User deleted successfully");
        router.refresh();
      } else {
        toast.error(data?.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const toggleCategorySelection = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter((c) => c !== category)
        : [...prev.selectedCategories, category],
    }));
  };

  const renderUserForm = (isEdit: boolean) => (
    <div className="space-y-4 mt-4">
      {/* Role Selection */}
      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, role: value }))
          }
          disabled={isEdit}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="STUDENT">Student</SelectItem>
            <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Personal Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name *</Label>
          <Input
            value={formData.firstName}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || validateName(value)) {
                setFormData((prev) => ({ ...prev, firstName: value }));
              }
            }}
            required
            placeholder="Only letters allowed"
          />
        </div>
        <div className="space-y-2">
          <Label>Last Name *</Label>
          <Input
            value={formData.lastName}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || validateName(value)) {
                setFormData((prev) => ({ ...prev, lastName: value }));
              }
            }}
            required
            placeholder="Only letters allowed"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email *</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          required
          disabled={isEdit}
        />
      </div>

      <div className="space-y-2">
        <Label>Phone Number</Label>
        <div className="flex gap-2">
          <Select
            value={formData.countryCode}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, countryCode: value }))
            }
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+351">🇵🇹 +351</SelectItem>
              <SelectItem value="+44">🇬🇧 +44</SelectItem>
              <SelectItem value="+1">🇺🇸 +1</SelectItem>
              <SelectItem value="+34">🇪🇸 +34</SelectItem>
              <SelectItem value="+33">🇫🇷 +33</SelectItem>
              <SelectItem value="+49">🇩🇪 +49</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                phoneNumber: e.target.value.replace(/\D/g, ""),
              }))
            }
            placeholder="912345678"
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          value={formData.address}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, address: e.target.value }))
          }
          placeholder="Full address"
        />
      </div>

      {/* Role-specific fields */}
      {formData.role === "STUDENT" && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900">Student Information</h3>

          <div className="space-y-2">
            <Label>License Categories *</Label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded border">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={formData.selectedCategories.includes(cat.name)}
                    onCheckedChange={() => toggleCategorySelection(cat.name)}
                  />
                  <label
                    htmlFor={`cat-${cat.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {cat.name}
                  </label>
                </div>
              ))}
            </div>
            {formData.selectedCategories.length > 0 && (
              <div className="text-sm text-blue-600 mt-2">
                Selected: {formData.selectedCategories.join(", ")}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Transmission Type</Label>
            <Select
              value={formData.transmissionType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, transmissionType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transmission" />
              </SelectTrigger>
              <SelectContent>
                {transmissionTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {formData.role === "INSTRUCTOR" && (
        <div className="space-y-4 p-4 bg-green-50 rounded-lg">
          <h3 className="font-medium text-green-900">Instructor Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input
                value={formData.instructorLicenseNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    instructorLicenseNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>License Expiry</Label>
              <Input
                type="date"
                value={formData.instructorLicenseExpiry}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    instructorLicenseExpiry: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={isEdit ? handleEditUser : handleCreateUser}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading
          ? isEdit
            ? "Saving..."
            : "Creating..."
          : isEdit
            ? "Save account"
            : "Create account"}
      </Button>
    </div>
  );

  const instructorAccounts = users.filter((u) => u.role === "INSTRUCTOR");
  const studentAccounts = users.filter((u) => u.role === "STUDENT");

  const renderAccountRow = (user: User) => (
    <div
      key={user.id}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
    >
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-full bg-driving-primary text-white flex items-center justify-center font-medium">
          {user.firstName?.[0]}
          {user.lastName?.[0]}
        </div>
        <div>
          <div className="font-medium">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-sm text-gray-600">{user.email}</div>
          <div className="text-sm text-gray-500">
            {user.phoneNumber || "No phone"} • {user.address || "No address"}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <Badge variant={user.role === "INSTRUCTOR" ? "default" : "secondary"}>
          {user.role === "INSTRUCTOR" ? "Instructor" : "Student"}
        </Badge>

        <Button
          size="sm"
          variant="outline"
          onClick={() => openEditDialog(user)}
          aria-label="Edit account"
        >
          <Edit2 className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleDeleteUser(user.id)}
          aria-label="Remove account"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">People</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Manage school operational student records and app login accounts.{" "}
          <strong>Student records</strong> (Students / Registered student
          records) can exist with or without an app account;{" "}
          <strong>app accounts</strong> are login credentials for students or
          instructors.
        </p>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingUser(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit app account</DialogTitle>
            <DialogDescription>
              Update app login account details.
            </DialogDescription>
          </DialogHeader>
          {renderUserForm(true)}
        </DialogContent>
      </Dialog>

      {/* Primary: operational student records */}
      <StudentRecordsManager />

      {/* Summary stats for app accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Student app accounts
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalStudents}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Instructor app accounts
            </CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalInstructors}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total app accounts
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.totalUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary: app login accounts */}
      <Card className="border-gray-200 bg-gray-50/40">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-gray-800">
              App accounts
            </CardTitle>
            <p className="text-sm text-gray-600 font-normal max-w-2xl">
              App login credentials. A student record can exist without an app
              account; creating an account here does not replace the student
              record in Students above.
            </p>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-driving-primary hover:bg-driving-primary/90 shrink-0">
                <UserPlus className="w-4 h-4 mr-2" />
                New account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New app account</DialogTitle>
                <DialogDescription>
                  Create login credentials for a student or instructor (does not
                  create an operational student record automatically).
                </DialogDescription>
              </DialogHeader>
              {renderUserForm(false)}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-8">
          {users.length === 0 ? (
            <p className="text-sm text-gray-500">No app accounts.</p>
          ) : (
            <>
              {instructorAccounts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Instructors
                  </h3>
                  <div className="space-y-4">
                    {instructorAccounts.map(renderAccountRow)}
                  </div>
                </div>
              )}
              {studentAccounts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Students (with app account)
                  </h3>
                  <div className="space-y-4">
                    {studentAccounts.map(renderAccountRow)}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <section
        className="mt-10 pt-8 border-t border-gray-200"
        aria-label="Invitations for app access"
      >
        <p className="text-sm text-gray-500 mb-4 max-w-3xl">
          Invitations grant app access by email. For student records, prefer{" "}
          <strong>Send invitation</strong> on the student row above so the
          invite links to the correct operational record. Use this section for
          instructor invites or other cases not covered by a student record yet.
        </p>
        <InvitationsManagementClient />
      </section>
    </>
  );
}
