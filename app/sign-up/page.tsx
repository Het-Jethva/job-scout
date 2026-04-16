import { Suspense } from "react"
import { SignUpForm } from "./sign-up-form"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

function SignUpFormSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <Skeleton className="h-8 w-56 mx-auto" />
        <Skeleton className="h-4 w-52 mx-auto" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-px w-full" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<SignUpFormSkeleton />}>
        <SignUpForm />
      </Suspense>
    </div>
  )
}
