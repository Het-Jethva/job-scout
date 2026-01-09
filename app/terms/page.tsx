import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Terms of Service - JobScout",
  description:
    "Terms of Service for JobScout - AI-Powered Job Discovery Platform",
}

export default function TermsPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <p className="text-muted-foreground">Last updated: January 9, 2026</p>
        </CardHeader>
        <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using JobScout, you accept and agree to be bound by
            the terms and provisions of this agreement. If you do not agree to
            these terms, please do not use our service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            JobScout is an AI-powered platform that helps job seekers match
            their resumes with job opportunities and optimize their
            applications. Our services include:
          </p>
          <ul>
            <li>Resume parsing and skill extraction</li>
            <li>Job matching based on AI analysis</li>
            <li>Resume optimization suggestions</li>
            <li>ATS compatibility analysis</li>
          </ul>

          <h2>3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account. You agree to notify us immediately of any unauthorized use
            of your account.
          </p>

          <h2>4. User Content</h2>
          <p>
            You retain ownership of any content you upload, including resumes
            and documents. By uploading content, you grant us a license to
            process this content for the purpose of providing our services.
          </p>

          <h2>5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Upload false or misleading information</li>
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the service</li>
            <li>Scrape or collect data from our platform</li>
          </ul>

          <h2>6. AI-Generated Content</h2>
          <p>
            Our AI provides suggestions and optimizations based on your input.
            You are responsible for reviewing and approving any AI-generated
            content before use. We do not guarantee the accuracy or suitability
            of AI suggestions for any particular purpose.
          </p>

          <h2>7. Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any
            kind. We do not guarantee job placement or interview success. Match
            scores and recommendations are estimates and should be used as
            guidance only.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            In no event shall JobScout be liable for any indirect, incidental,
            special, consequential, or punitive damages arising out of your use
            of the service.
          </p>

          <h2>9. Termination</h2>
          <p>
            We reserve the right to terminate or suspend your account at any
            time for violations of these terms. You may delete your account at
            any time through the settings page.
          </p>

          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued
            use of the service after changes constitutes acceptance of the new
            terms.
          </p>

          <h2>11. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with
            applicable laws, without regard to conflict of law principles.
          </p>

          <h2>12. Contact</h2>
          <p>
            For any questions about these Terms of Service, please contact us
            through our support channels.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
