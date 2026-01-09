import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm, PreferencesForm, DangerZone } from "./components"

export const runtime = "nodejs"

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/settings")
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      userPreferences: true,
      userSkills: true,
    },
  })

  if (!user) {
    redirect("/sign-in")
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and job preferences
        </p>
      </div>

      <Tabs
        defaultValue="profile"
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Job Preferences</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                initialData={{
                  name: user.name || "",
                  email: user.email,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Job Preferences</CardTitle>
              <CardDescription>
                Set your preferences to get better job matches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreferencesForm
                initialData={{
                  preferredJobTypes:
                    user.userPreferences?.preferredJobTypes || [],
                  preferredLocations:
                    user.userPreferences?.preferredLocations || [],
                  minSalary: user.userPreferences?.salaryMin || undefined,
                  maxSalary: user.userPreferences?.salaryMax || undefined,
                  remoteOnly: user.userPreferences?.remoteOnly || false,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DangerZone />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
