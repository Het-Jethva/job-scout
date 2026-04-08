"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  updateProfile,
  updatePreferences,
  deleteAccount,
} from "@/app/actions/settings-actions"
import { FadeIn, HoverScale, SuccessCheckmark } from "@/components/ui/motion"
import { signOut } from "@/lib/auth-client"

interface ProfileFormProps {
  initialData: {
    name: string
    email: string
  }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initialData.name)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateProfile({ name })
      if (result.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
        toast.success("Profile updated successfully")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update profile")
      }
    })
  }

  return (
    <FadeIn>
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={initialData.email}
            disabled
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>
        <HoverScale>
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={isPending}
              className="relative"
            >
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <SuccessCheckmark size={16} />
                    Saved!
                  </motion.span>
                ) : isPending ? (
                  <motion.span
                    key="pending"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Saving...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Save Changes
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </HoverScale>
      </motion.form>
    </FadeIn>
  )
}

const JOB_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
]

interface PreferencesFormProps {
  initialData: {
    preferredJobTypes: string[]
    preferredLocations: string[]
    minSalary?: number
    maxSalary?: number
    remoteOnly: boolean
  }
}

export function PreferencesForm({ initialData }: PreferencesFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [jobTypes, setJobTypes] = useState<string[]>(
    initialData.preferredJobTypes
  )
  const [locations, setLocations] = useState<string[]>(
    initialData.preferredLocations
  )
  const [locationInput, setLocationInput] = useState("")
  const [minSalary, setMinSalary] = useState(
    initialData.minSalary?.toString() || ""
  )
  const [maxSalary, setMaxSalary] = useState(
    initialData.maxSalary?.toString() || ""
  )
  const [remoteOnly, setRemoteOnly] = useState(initialData.remoteOnly)
  const [showSuccess, setShowSuccess] = useState(false)

  const toggleJobType = (type: string) => {
    setJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const addLocation = () => {
    if (locationInput.trim() && !locations.includes(locationInput.trim())) {
      setLocations([...locations, locationInput.trim()])
      setLocationInput("")
    }
  }

  const removeLocation = (loc: string) => {
    setLocations(locations.filter((l) => l !== loc))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await updatePreferences({
        preferredJobTypes: jobTypes,
        preferredLocations: locations,
        minSalary: minSalary ? parseInt(minSalary) : undefined,
        maxSalary: maxSalary ? parseInt(maxSalary) : undefined,
        remoteOnly,
      })
      if (result.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
        toast.success("Preferences updated successfully")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update preferences")
      }
    })
  }

  return (
    <FadeIn delay={0.1}>
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="space-y-2">
          <Label>Job Types</Label>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map((type, index) => (
              <motion.div
                key={type.value}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Badge
                  variant={
                    jobTypes.includes(type.value) ? "default" : "outline"
                  }
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleJobType(type.value)}
                >
                  {type.label}
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Preferred Locations</Label>
          <div className="flex gap-2">
            <Input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Add a location..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addLocation()
                }
              }}
            />
            <HoverScale>
              <Button
                type="button"
                variant="secondary"
                onClick={addLocation}
              >
                Add
              </Button>
            </HoverScale>
          </div>
          <AnimatePresence>
            {locations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 mt-2"
              >
                {locations.map((loc) => (
                  <motion.div
                    key={loc}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                  >
                    <Badge variant="secondary">
                      {loc}
                      <motion.button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={() => removeLocation(loc)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        ×
                      </motion.button>
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minSalary">Minimum Salary</Label>
            <Input
              id="minSalary"
              type="number"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
              placeholder="50000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxSalary">Maximum Salary</Label>
            <Input
              id="maxSalary"
              type="number"
              value={maxSalary}
              onChange={(e) => setMaxSalary(e.target.value)}
              placeholder="150000"
            />
          </div>
        </div>

        <motion.div
          className="flex items-center justify-between"
          whileHover={{ x: 2 }}
        >
          <div>
            <Label htmlFor="remoteOnly">Remote Only</Label>
            <p className="text-sm text-muted-foreground">
              Only show remote job opportunities
            </p>
          </div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Switch
              id="remoteOnly"
              checked={remoteOnly}
              onCheckedChange={setRemoteOnly}
            />
          </motion.div>
        </motion.div>

        <HoverScale>
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={isPending}
            >
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <SuccessCheckmark size={16} />
                    Saved!
                  </motion.span>
                ) : isPending ? (
                  <motion.span
                    key="pending"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Saving...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Save Preferences
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </HoverScale>
      </motion.form>
    </FadeIn>
  )
}

export function DangerZone() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDeleteAccount = () => {
    startTransition(async () => {
      const result = await deleteAccount()
      if (result.success) {
        await signOut()
        toast.success("Account deleted successfully")
        router.push("/")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete account")
      }
    })
  }

  return (
    <FadeIn delay={0.2}>
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <motion.div
          className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5"
          whileHover={{ borderColor: "hsl(var(--destructive) / 0.4)" }}
          transition={{ duration: 0.2 }}
        >
          <div>
            <h4 className="font-medium">Delete Account</h4>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="destructive"
                  disabled={isPending}
                >
                  {isPending ? (
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      Deleting...
                    </motion.span>
                  ) : (
                    "Delete Account"
                  )}
                </Button>
              </motion.div>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all your data including resumes, job
                    matches, and tailored documents.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </motion.div>
                </AlertDialogFooter>
              </motion.div>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </motion.div>
    </FadeIn>
  )
}
