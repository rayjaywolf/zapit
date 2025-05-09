"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const CORRECT_PASSWORD = "swiftsend2025" // You can change this to your desired password

export function PasswordProtection({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState("")

    useEffect(() => {
        // Check if user is already authenticated
        const auth = localStorage.getItem("swiftsend_auth")
        if (auth === "true") {
            setIsAuthenticated(true)
        }
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (password === CORRECT_PASSWORD) {
            setIsAuthenticated(true)
            localStorage.setItem("swiftsend_auth", "true")
            toast.success("Welcome to SwiftSend!")
        } else {
            toast.error("Incorrect password")
            setPassword("")
        }
    }

    if (isAuthenticated) {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center">
            <div className="w-full max-w-sm p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">SwiftSend</h1>
                    <p className="text-muted-foreground">Enter password to continue</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="text-center"
                    />
                    <Button type="submit" className="w-full">
                        Continue
                    </Button>
                </form>
            </div>
        </div>
    )
} 