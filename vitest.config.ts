import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
    test: {
        // Environment for testing
        environment: "node",

        // Include test files
        include: ["**/*.{test,spec}.{ts,tsx}"],

        // Exclude patterns
        exclude: ["node_modules", ".next", "dist"],

        // Coverage configuration
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["lib/**/*.ts", "app/**/*.ts"],
            exclude: [
                "**/*.d.ts",
                "**/*.test.ts",
                "**/*.spec.ts",
                "**/node_modules/**",
            ],
        },

        // Setup files (optional, for global setup)
        // setupFiles: ['./vitest.setup.ts'],

        // Type checking
        typecheck: {
            enabled: true,
        },
    },

    // Path resolution matching Next.js
    resolve: {
        alias: {
            "@": resolve(__dirname, "./"),
        },
    },
})
