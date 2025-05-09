"use client"

import Image from "next/image"
import Link from "next/link"

export function Logo() {
    return (
        <Link href="/" className="flex items-center">
            <Image
                src="/zapit.png"
                alt="SwiftSend Logo"
                width={100}
                height={32}
                className="h-8 w-auto"
                priority
            />
        </Link>
    )
} 