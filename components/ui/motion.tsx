"use client"

import * as React from "react"
import { motion, AnimatePresence, type Variants } from "motion/react"

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
}

export const slideInFromLeft: Variants = {
  initial: { x: -100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: { x: -100, opacity: 0 },
}

export const slideInFromRight: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: { x: 100, opacity: 0 },
}

export const popIn: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  exit: { scale: 0, opacity: 0 },
}

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

interface MotionDivProps extends React.ComponentProps<typeof motion.div> {
  children: React.ReactNode
}

export function MotionDiv({ children, ...props }: MotionDivProps) {
  return <motion.div {...props}>{children}</motion.div>
}

// Fade In Component
interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  direction?: "up" | "down" | "left" | "right" | "none"
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = "up",
}: FadeInProps) {
  const variants: Record<string, Variants> = {
    up: fadeInUp,
    down: fadeInDown,
    left: fadeInLeft,
    right: fadeInRight,
    none: fadeIn,
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants[direction]}
      transition={{ duration, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger Container
interface StaggerContainerProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger Item
interface StaggerItemProps {
  children: React.ReactNode
  className?: string
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Scale on Hover Button Wrapper
interface HoverScaleProps {
  children: React.ReactNode
  className?: string
  scale?: number
}

export function HoverScale({
  children,
  className,
  scale = 1.02,
}: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Tap Scale Animation
interface TapScaleProps {
  children: React.ReactNode
  className?: string
}

export function TapScale({ children, className }: TapScaleProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Hover Lift Effect
interface HoverLiftProps {
  children: React.ReactNode
  className?: string
}

export function HoverLift({ children, className }: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{
        y: -4,
        transition: { type: "spring", stiffness: 400, damping: 17 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated Card with Hover Effects
interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      whileHover={{
        y: -4,
        boxShadow: "0 12px 24px -8px rgba(0, 0, 0, 0.15)",
        transition: { type: "spring", stiffness: 400, damping: 17 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated List Container
interface AnimatedListProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated List Item
interface AnimatedListItemProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedListItem({
  children,
  className,
}: AnimatedListItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{
        x: 4,
        transition: { type: "spring", stiffness: 400, damping: 17 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Pulse Animation for Notifications/Status
interface PulseProps {
  children: React.ReactNode
  className?: string
  duration?: number
}

export function Pulse({ children, className, duration = 2 }: PulseProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Shake Animation for Errors
interface ShakeProps {
  children: React.ReactNode
  className?: string
  trigger?: boolean
}

export function Shake({ children, className, trigger }: ShakeProps) {
  return (
    <motion.div
      animate={
        trigger
          ? {
              x: [0, -10, 10, -10, 10, 0],
              transition: { duration: 0.5 },
            }
          : {}
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Bounce Animation
interface BounceProps {
  children: React.ReactNode
  className?: string
}

export function Bounce({ children, className }: BounceProps) {
  return (
    <motion.div
      animate={{
        y: [0, -8, 0],
      }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Spin Animation for Loading
interface SpinProps {
  children: React.ReactNode
  className?: string
  duration?: number
}

export function Spin({ children, className, duration = 1 }: SpinProps) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Counter Animation
interface AnimatedCounterProps {
  value: number
  className?: string
  duration?: number
}

export function AnimatedCounter({
  value,
  className,
  duration = 1,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0)
  const startValueRef = React.useRef(0)

  React.useEffect(() => {
    let startTime: number | null = null
    startValueRef.current = displayValue

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const progress = Math.min(
        (currentTime - startTime) / (duration * 1000),
        1
      )

      setDisplayValue(
        Math.floor(
          startValueRef.current + (value - startValueRef.current) * progress
        )
      )

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return <span className={className}>{displayValue}</span>
}

// Progress Bar Animation
interface AnimatedProgressProps {
  value: number
  className?: string
  duration?: number
}

export function AnimatedProgress({
  value,
  className,
  duration = 0.8,
}: AnimatedProgressProps) {
  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{
          duration,
          ease: [0.25, 0.4, 0.25, 1],
        }}
        className="h-full bg-primary"
      />
    </div>
  )
}

// Tooltip Animation
interface AnimatedTooltipProps {
  children: React.ReactNode
  content: string
  className?: string
}

export function AnimatedTooltip({
  children,
  content,
  className,
}: AnimatedTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
          >
            {content}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Number Ticker for Statistics
interface NumberTickerProps {
  value: number
  direction?: "up" | "down"
  delay?: number
  className?: string
  decimalPlaces?: number
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
}: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [isInView, setIsInView] = React.useState(false)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const [displayValue, setDisplayValue] = React.useState(
    direction === "down" ? value : 0
  )

  React.useEffect(() => {
    if (!isInView) return

    const startValue = direction === "down" ? value : 0
    const endValue = direction === "down" ? 0 : value
    const duration = 2000
    const startTime = Date.now() + delay * 1000

    const tick = () => {
      const now = Date.now()
      if (now < startTime) {
        requestAnimationFrame(tick)
        return
      }

      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      const currentValue = startValue + (endValue - startValue) * easeProgress

      setDisplayValue(Number(currentValue.toFixed(decimalPlaces)))

      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }, [value, direction, delay, decimalPlaces, isInView])

  return (
    <span
      ref={ref}
      className={className}
    >
      {displayValue}
    </span>
  )
}

// Animated Badge with Pop Effect
interface AnimatedBadgeProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function AnimatedBadge({
  children,
  className,
  delay = 0,
}: AnimatedBadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 15,
        delay,
      }}
      whileHover={{ scale: 1.05 }}
      className={className}
    >
      {children}
    </motion.span>
  )
}

// Floating Animation
interface FloatProps {
  children: React.ReactNode
  className?: string
  duration?: number
  distance?: number
}

export function Float({
  children,
  className,
  duration = 3,
  distance = 10,
}: FloatProps) {
  return (
    <motion.div
      animate={{
        y: [-distance / 2, distance / 2, -distance / 2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Reveal on Scroll
interface RevealOnScrollProps {
  children: React.ReactNode
  className?: string
  direction?: "up" | "down" | "left" | "right"
}

export function RevealOnScroll({
  children,
  className,
  direction = "up",
}: RevealOnScrollProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const directionVariants = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directionVariants[direction] }}
      animate={
        isVisible
          ? { opacity: 1, x: 0, y: 0 }
          : { opacity: 0, ...directionVariants[direction] }
      }
      transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated Icon Button
interface AnimatedIconButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}

export function AnimatedIconButton({
  children,
  className,
  onClick,
  disabled,
  type = "button",
}: AnimatedIconButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.button>
  )
}

// Magnetic Button Effect
interface MagneticProps {
  children: React.ReactNode
  className?: string
}

export function Magnetic({ children, className }: MagneticProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e
    const { left, top, width, height } = currentTarget.getBoundingClientRect()

    const x = (clientX - left - width / 2) * 0.3
    const y = (clientY - top - height / 2) * 0.3

    setPosition({ x, y })
  }

  const reset = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={position}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated Gradient Background
interface AnimatedGradientProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedGradient({
  children,
  className,
}: AnimatedGradientProps) {
  return (
    <motion.div
      className={className}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{
        backgroundSize: "200% 200%",
      }}
    >
      {children}
    </motion.div>
  )
}

// Loading Dots
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
          }}
          className="h-2 w-2 rounded-full bg-primary"
        />
      ))}
    </div>
  )
}

// Success Checkmark Animation
export function SuccessCheckmark({
  className,
  size = 24,
}: {
  className?: string
  size?: number
}) {
  return (
    <motion.svg
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`text-green-500 ${className}`}
      style={{ width: size, height: size }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </motion.svg>
  )
}

// Page Transition Wrapper
interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export { AnimatePresence }
