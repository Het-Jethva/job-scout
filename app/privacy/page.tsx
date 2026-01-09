import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Privacy Policy - JobScout",
  description:
    "Privacy Policy for JobScout - AI-Powered Job Discovery Platform",
}

export default function PrivacyPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <p className="text-muted-foreground">Last updated: January 9, 2026</p>
        </CardHeader>
        <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul>
            <li>Account information (name, email address, password)</li>
            <li>Resume and professional documents you upload</li>
            <li>Job preferences and search criteria</li>
            <li>Usage data and interaction with our services</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Match your resume with relevant job opportunities</li>
            <li>Generate AI-powered resume optimization suggestions</li>
            <li>Send you notifications about matches and updates</li>
            <li>Respond to your comments and questions</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal
            information to outside parties. Your resume data is only used to
            provide matching and optimization services within our platform.
          </p>

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal
            information. All data is encrypted in transit and at rest. We use
            industry-standard security practices to safeguard your data.
          </p>

          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and associated data</li>
            <li>Export your data</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2>6. Cookies</h2>
          <p>
            We use essential cookies to maintain your session and preferences.
            We do not use tracking cookies for advertising purposes.
          </p>

          <h2>7. Third-Party Services</h2>
          <p>
            We use third-party services for authentication, file storage, and AI
            processing. These services have their own privacy policies governing
            their use of information.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify
            you of any changes by posting the new policy on this page and
            updating the &quot;Last updated&quot; date.
          </p>

          <h2>9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact
            us through our support channels.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
