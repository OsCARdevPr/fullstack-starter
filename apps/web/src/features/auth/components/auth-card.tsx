import type { ReactNode } from "react";
import { AppLogo } from "@/components/layout/app-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered card used by the public auth pages. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <AppLogo className="self-center text-lg" />
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && (
          <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>
        )}
      </Card>
    </div>
  );
}
