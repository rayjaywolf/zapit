"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Zap, Shield, Globe, Lock, Send, Download, Share2, Check, Bell } from "lucide-react"
import Link from "next/link"
import { TextReveal } from "@/components/magicui/text-reveal"
import { SparklesText } from "@/components/magicui/sparkles-text"
import { AnimatedList } from "@/components/magicui/animated-list"
import { useInView } from "react-intersection-observer"
import { useState, useEffect } from "react"
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid"
import { Marquee } from "@/components/magicui/marquee"

export default function Home() {
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  useEffect(() => {
    if (inView) {
      setProgress(0)
      setIsComplete(false)
      setTimeout(() => setProgress(100), 100)
      setTimeout(() => setIsComplete(true), 1600)
    }
  }, [inView])

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="fixed top-0 w-full z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-24">
          <div className="font-semibold text-xl">Zapit</div>
          <div className="flex items-center gap-4">
            <Link href="/share">
              <Button>Start Transfer</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="min-h-[calc(100vh-4rem)] flex items-center relative overflow-hidden bg-gradient-to-b from-background via-background/95 to-muted/50">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:75px_75px]" />
          <div className="relative z-10 px-24 w-full">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
                AirDrop for
                <br />
                Everyone, Everywhere
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Share files instantly between any devices - phones, tablets, computers. No app installation, no sign-up required. Just like AirDrop, but for all platforms.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/share">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary">
                    Transfer Files Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">End-to-end encrypted</span>
                </div>
              </div>
              <div className="mt-12 flex items-center justify-center gap-8">
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-primary">5GB+</div>
                  <div className="text-sm text-muted-foreground">File Size</div>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-primary">Instant</div>
                  <div className="text-sm text-muted-foreground">Transfer</div>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-primary">Any</div>
                  <div className="text-sm text-muted-foreground">Platform</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TextReveal className="bg-background">
          Experience the future of file sharing with Zapit. No limits, no boundaries, just seamless transfers across all your devices.
        </TextReveal>

        <section className="py-20 md:py-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:75px_75px]" />
          <div className="relative z-10 px-24 w-full">
            <div className="max-w-4xl mx-auto text-center">
              <div className="text-3xl md:text-6xl font-bold mb-12">
                Works Just Like <SparklesText
                  sparklesCount={6}
                  text="Magic"
                  className="inline-block font-bold text-3xl md:text-6xl"
                />
              </div>
              <div className="relative flex w-full flex-col overflow-hidden h-[600px]">
                <div ref={ref}>
                  {inView && (
                    <AnimatedList delay={1500} className="text-left">
                      <figure className="relative mx-auto min-h-fit w-full max-w-[700px] cursor-pointer overflow-hidden rounded-2xl p-8 transition-all duration-200 ease-in-out hover:scale-[103%] bg-card dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
                        <div className="flex flex-row items-center gap-6">
                          <div className={`flex size-20 items-center justify-center rounded-[20%] transition-colors duration-300 ${isComplete ? 'bg-green-500' : 'bg-primary/20'} p-2`}>
                            {isComplete ? (
                              <Check className="h-8 w-8 text-white" />
                            ) : (
                              <span className="text-3xl">📤</span>
                            )}
                          </div>
                          <div className="flex flex-col overflow-hidden w-full gap-3">
                            <div className="flex justify-between items-start w-full">
                              <figcaption className="text-xl font-medium">
                                {isComplete ? 'Files Sent Successfully' : 'Sending Files...'}
                              </figcaption>
                              <span className="text-sm text-muted-foreground shrink-0 ml-4">Now</span>
                            </div>
                            <p className="text-sm font-normal text-muted-foreground mb-2">
                              design-mockup.fig · 4.2 GB
                            </p>
                            <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-[1500ms] ease-in-out ${isComplete ? 'bg-green-500' : 'bg-primary'}`} style={{
                                width: `${progress}%`
                              }}></div>
                            </div>
                          </div>
                        </div>
                      </figure>

                      <figure className="relative mx-auto min-h-fit w-full max-w-[700px] cursor-pointer overflow-hidden rounded-2xl p-8 transition-all duration-200 ease-in-out hover:scale-[103%] bg-card dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
                        <div className="flex flex-row items-center gap-6">
                          <div className="flex size-20 items-center justify-center rounded-[20%] bg-[#1E86FF] p-2">
                            <span className="text-3xl">📥</span>
                          </div>
                          <div className="flex flex-col overflow-hidden w-full gap-3">
                            <div className="flex justify-between items-start w-full">
                              <figcaption className="text-xl font-medium">Files Received</figcaption>
                              <span className="text-sm text-muted-foreground shrink-0 ml-4">2m ago</span>
                            </div>
                            <p className="text-sm font-normal text-muted-foreground">
                              project-files.zip · 156 MB
                            </p>
                          </div>
                        </div>
                      </figure>

                      <figure className="relative mx-auto min-h-fit w-full max-w-[700px] cursor-pointer overflow-hidden rounded-2xl p-8 transition-all duration-200 ease-in-out hover:scale-[103%] bg-card dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
                        <div className="flex flex-row items-center gap-6">
                          <div className="flex size-20 items-center justify-center rounded-[20%] bg-[#FFB800] p-2">
                            <span className="text-3xl">📥</span>
                          </div>
                          <div className="flex flex-col overflow-hidden w-full gap-3">
                            <div className="flex justify-between items-start w-full">
                              <figcaption className="text-xl font-medium">Files Received</figcaption>
                              <span className="text-sm text-muted-foreground shrink-0 ml-4">5m ago</span>
                            </div>
                            <p className="text-sm font-normal text-muted-foreground">
                              family-photos.zip · 1.2 GB
                            </p>
                          </div>
                        </div>
                      </figure>
                    </AnimatedList>
                  )}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background"></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 md:py-32 pt-0">
          <div className="px-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Zapit?</h2>
              <p className="text-xl text-muted-foreground">The fastest way to share files between devices</p>
            </div>
            <BentoGrid className="auto-rows-[20rem] grid-cols-1 md:grid-cols-3 lg:grid-rows-3 gap-4">
              <BentoCard
                name="Lightning Fast"
                description="Transfer files at blazing speeds with our peer-to-peer technology. Experience instant file sharing like never before."
                Icon={Zap}
                className="col-span-1 md:col-span-2 lg:row-start-1 lg:row-end-3"
                background={<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />}
                href="/share"
                cta="Try it now"
              />
              <BentoCard
                name="Secure & Private"
                description="End-to-end encryption ensures your files stay private. Direct device-to-device transfer with no cloud storage."
                Icon={Shield}
                className="col-span-1 lg:row-start-3"
                background={<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />}
                href="/share"
                cta="Learn more"
              />
              <BentoCard
                name="No Limits"
                description="Share files of any size without restrictions. Perfect for large files, folders, and multiple items at once."
                Icon={Globe}
                className="col-span-1 lg:row-start-1"
                background={<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />}
                href="/share"
                cta="Start sharing"
              />
              <BentoCard
                name="Cross Platform"
                description="Works seamlessly across all devices and operating systems. Share between phones, tablets, and computers with ease."
                Icon={Share2}
                className="col-span-1 md:col-span-2 lg:row-start-3"
                background={<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />}
                href="/share"
                cta="Get started"
              />
              <BentoCard
                name="Real-time Notifications"
                description="Stay informed with instant notifications for file transfers, shares, and mentions. Never miss an important update."
                Icon={Bell}
                className="col-span-1 lg:row-start-2 lg:row-end-3"
                background={<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />}
                href="/share"
                cta="Enable notifications"
              />
            </BentoGrid>
          </div>
        </section>

        <section className="py-20 md:py-32 bg-muted/50">
          <div className="px-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-xl text-muted-foreground">Simple, fast, and secure file sharing</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-background to-muted p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                    <Send className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">1. Select Files</h3>
                  <p className="text-muted-foreground">Choose any files you want to share - documents, images, videos, or entire folders. No size limits.</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-background to-muted p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                    <Share2 className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">2. Connect</h3>
                  <p className="text-muted-foreground">Enter the recipient's Zap ID or let them scan your QR code for an instant secure connection.</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-background to-muted p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                    <Download className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">3. Transfer</h3>
                  <p className="text-muted-foreground">Watch your files transfer in real-time with end-to-end encryption and blazing-fast speeds.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-32">
          <div className="   px-24">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Sharing?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of users who trust Zapit for their file sharing needs.
              </p>
              <Link href="/share">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="   px-24">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-semibold">Zapit</div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Zapit. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
