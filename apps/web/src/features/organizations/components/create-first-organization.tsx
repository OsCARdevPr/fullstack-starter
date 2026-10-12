import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateOrganizationForm } from "./create-organization-form";

/** Shown instead of the app pages to multi-tenancy users who do not belong to an organization. */
export function CreateFirstOrganization() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Create your first organization</h1>
          </CardTitle>
          <CardDescription>
            Your projects and team live in an organization. You can create more later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}
