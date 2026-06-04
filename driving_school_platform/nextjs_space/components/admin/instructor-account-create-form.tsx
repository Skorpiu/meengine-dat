"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

async function tryReadJson<T = unknown>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  countryCode: "+351",
  address: "",
  instructorLicenseNumber: "",
  instructorLicenseExpiry: "",
});

type InstructorAccountCreateFormProps = {
  onCreated?: () => void;
};

export function InstructorAccountCreateForm({
  onCreated,
}: InstructorAccountCreateFormProps = {}) {
  const router = useRouter();
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);

  const validateName = (name: string) => /^[A-Za-zÀ-ÿ\s'-]+$/.test(name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateName(formData.firstName)) {
      toast.error("First name can only contain letters");
      return;
    }
    if (!validateName(formData.lastName)) {
      toast.error("Last name can only contain letters");
      return;
    }
    if (!formData.instructorLicenseNumber.trim()) {
      toast.error("Instructor license number is required");
      return;
    }
    if (!formData.instructorLicenseExpiry) {
      toast.error("Instructor license expiry is required");
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
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: fullPhoneNumber,
          address: formData.address,
          role: "INSTRUCTOR",
          instructorLicenseNumber: formData.instructorLicenseNumber,
          instructorLicenseExpiry: formData.instructorLicenseExpiry,
        }),
      });

      const data = await tryReadJson<{ tempPassword?: string; error?: string }>(
        response,
      );

      if (response.ok) {
        if (data?.tempPassword) {
          toast.success(
            `Instructor account created! Temporary password: ${data.tempPassword}`,
          );
        } else {
          toast.success("Instructor account created successfully.");
        }
        setFormData(emptyForm());
        onCreated?.();
        router.refresh();
      } else {
        toast.error(data?.error || "Failed to create instructor account");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">New instructor</CardTitle>
        <p className="text-sm text-gray-600 font-normal">
          Creates an app login account and operational instructor profile with
          license details. Use an invitation below instead when the instructor
          should register themselves via email.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First name *</Label>
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
              <Label>Last name *</Label>
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
            />
          </div>

          <div className="space-y-2">
            <Label>Phone number</Label>
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

          <div className="space-y-4 p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900">Instructor license</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License number *</Label>
                <Input
                  value={formData.instructorLicenseNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      instructorLicenseNumber: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>License expiry *</Label>
                <Input
                  type="date"
                  value={formData.instructorLicenseExpiry}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      instructorLicenseExpiry: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-driving-primary hover:bg-driving-primary/90"
          >
            {isLoading ? "Creating…" : "Create instructor"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
