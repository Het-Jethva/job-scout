"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  HoverScale,
  HoverLift,
  RevealOnScroll,
  Float,
  NumberTicker,
  Magnetic,
} from "@/components/ui/motion"
import { motion } from "motion/react"

const features = [
  {
    title: "Smart Resume Matching",
    description:
      "Upload your resume and get instant match scores with real job listings from multiple sources.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "AI-Powered Analysis",
    description:
      "AI extracts skills, analyzes job requirements, and calculates semantic similarity scores using advanced language models.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    title: "Skill Gap Analysis",
    description:
      "Identify missing skills and get actionable insights to improve your job applications.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    title: "ATS Optimization",
    description:
      "Tailor your resume for specific jobs while maintaining complete factual accuracy.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    title: "Real-Time Job Data",
    description:
      "Access jobs from The Muse, Remotive, RemoteOK, and more - updated continuously.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
    ),
  },
  {
    title: "Transparent Scoring",
    description:
      "Understand exactly why you match or don't match - no black-box algorithms.",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
  },
]

const workflow = [
  { step: 1, title: "Upload Resume", description: "PDF, DOCX, or TXT formats" },
  { step: 2, title: "AI Analysis", description: "Skills & keywords extracted" },
  { step: 3, title: "Job Matching", description: "Real-time job comparison" },
  { step: 4, title: "Get Insights", description: "Scores & gap analysis" },
  { step: 5, title: "Optimize", description: "Tailor for specific jobs" },
]

const stats = [
  { value: 10000, label: "Jobs Analyzed", suffix: "+" },
  { value: 95, label: "Match Accuracy", suffix: "%" },
  { value: 50, label: "Skills Extracted", suffix: "+" },
  { value: 24, label: "Hour Updates", suffix: "/7" },
]

export function HomePageClient() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container py-24 md:py-32 space-y-8 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <Float
            duration={6}
            distance={20}
          >
            <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
          </Float>
          <Float
            duration={8}
            distance={15}
          >
            <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          </Float>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
          <FadeIn delay={0.1}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center rounded-full border px-3 py-1 text-sm cursor-default"
            >
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                🚀
              </motion.span>
              <span className="ml-2">AI-Powered Job Matching</span>
            </motion.div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Find Your Perfect Job Match
              <br />
              <span className="text-primary">With AI Precision</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.3}>
            <p className="max-w-175 text-lg text-muted-foreground md:text-xl">
              JobScout analyzes your resume, matches you with real job listings,
              and helps you optimize your applications - all while keeping your
              experience 100% accurate.
            </p>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Magnetic>
                <Link href="/sign-up">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      size="lg"
                      className="text-lg px-8 relative overflow-hidden group"
                    >
                      <span className="relative z-10">Get Started Free</span>
                      <motion.div
                        className="absolute inset-0 bg-primary-foreground/10"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.5 }}
                      />
                    </Button>
                  </motion.div>
                </Link>
              </Magnetic>
              <Magnetic>
                <Link href="/sign-in">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-lg px-8"
                    >
                      Sign In
                    </Button>
                  </motion.div>
                </Link>
              </Magnetic>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container py-12 border-t">
        <StaggerContainer className="grid gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <StaggerItem key={stat.label}>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  <NumberTicker
                    value={stat.value}
                    delay={index * 0.1}
                  />
                  {stat.suffix}
                </div>
                <p className="text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* Workflow Section */}
      <section className="container py-16 border-t">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="text-muted-foreground mt-2">
              Five simple steps to your dream job
            </p>
          </div>
        </RevealOnScroll>

        <div className="flex flex-wrap justify-center gap-4">
          {workflow.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="flex items-center"
            >
              <HoverScale scale={1.05}>
                <div className="flex flex-col items-center text-center p-4">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-2"
                  >
                    {item.step}
                  </motion.div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </HoverScale>
              {index < workflow.length - 1 && (
                <motion.svg
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="w-8 h-8 text-muted-foreground hidden md:block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </motion.svg>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-16 border-t">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything You Need
            </h2>
            <p className="text-muted-foreground mt-2">
              Powerful features to supercharge your job search
            </p>
          </div>
        </RevealOnScroll>

        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <HoverLift>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 17,
                      }}
                      className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4"
                    >
                      {feature.icon}
                    </motion.div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </HoverLift>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* CTA Section */}
      <section className="container py-24 border-t">
        <RevealOnScroll>
          <div className="flex flex-col items-center text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to Find Your Match?
            </h2>
            <p className="max-w-150 text-muted-foreground">
              Join thousands of job seekers using AI to find their perfect role.
              No credit card required.
            </p>
            <Magnetic>
              <Link href="/sign-up">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    className="mt-4 relative overflow-hidden"
                  >
                    <span className="relative z-10">Start Matching Now</span>
                    <motion.div
                      className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    />
                  </Button>
                </motion.div>
              </Link>
            </Magnetic>
          </div>
        </RevealOnScroll>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <FadeIn>
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 JobScout. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </FadeIn>
      </footer>
    </div>
  )
}
