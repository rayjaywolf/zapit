"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Lock,
  Send,
  Download,
  Share2,
  Check,
  Bell,
  Twitter,
} from "lucide-react";
import Link from "next/link";
import { TextReveal } from "@/components/magicui/text-reveal";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { AnimatedList } from "@/components/magicui/animated-list";
import { useInView } from "react-intersection-observer";
import { useState, useEffect } from "react";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { WarpBackground } from "@/components/magicui/warp-background";
import { Marquee } from "@/components/magicui/marquee";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      setProgress(0);
      setIsComplete(false);
      setTimeout(() => setProgress(100), 100);
      setTimeout(() => setIsComplete(true), 1600);
    }
  }, [inView]);

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="fixed top-0 w-full z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 md:px-12 lg:px-24">
          <Logo />
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center justify-center px-2 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
              Contract Address: 12BGXMsSEqgUeyMBpyC51hk3ZgChYERJsdVTQTsypump
            </div>
            <a
              href="https://x.com/swiftsendonsol"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 rounded-full hover:bg-primary/10 transition-colors"
              aria-label="Follow us on Twitter"
            >
              <Twitter className="h-4 w-4 text-primary" />
            </a>
          </div>
          <div className="flex items-center">
            <Link href="/share">
              <Button size="sm" className="sm:hidden">
                Start
              </Button>
              <Button className="hidden sm:flex">Start Transfer</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="min-h-[calc(100vh-3.5rem)] flex items-center relative overflow-hidden w-full">
          <WarpBackground
            className="w-full h-full border-none flex items-center justify-center"
            gridColor="rgba(255, 255, 255, 0.2)"
            beamsPerSide={2}
          >
            <div className="relative z-10 w-full px-3 sm:px-4 md:px-12 lg:px-24">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-2xl sm:text-3xl md:text-7xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
                  AirDrop for&nbsp;
                  <br className="sm:hidden" />
                  Everyone,
                  <br className="hidden sm:block" />
                  Everywhere
                </h1>
                <p className="text-sm sm:text-base md:text-xl text-muted-foreground mb-4 sm:mb-6 md:mb-10 max-w-2xl mx-auto px-2 sm:px-0">
                  Experience the future of file sharing with SwiftSend. No
                  limits, no boundaries, just seamless transfers across all your
                  devices.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4 sm:px-0">
                  <Link href="/share" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      Transfer Files Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary/80" />
                    <span className="text-xs sm:text-sm">
                      End-to-end encrypted
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6 sm:gap-12">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-3xl font-bold text-primary">
                      5GB+
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground/80 mt-1">
                      File Size
                    </div>
                  </div>
                  <div className="h-8 sm:h-10 w-px bg-border/50" />
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-3xl font-bold text-primary">
                      Instant
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground/80 mt-1">
                      Transfer
                    </div>
                  </div>
                  <div className="h-8 sm:h-10 w-px bg-border/50" />
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-3xl font-bold text-primary">
                      Any
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground/80 mt-1">
                      Platform
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </WarpBackground>
        </section>

        <TextReveal className="bg-background px-6 md:px-12 lg:px-24">
          Experience the future of file sharing with SwiftSend. No limits, no
          boundaries, just seamless transfers across all your devices.
        </TextReveal>

        <section className="py-0 md:py-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:100px_100px]" />
          <div className="relative z-10 px-6 md:px-12 lg:px-24 w-full">
            <div className="max-w-4xl mx-auto text-center">
              <div className="text-3xl md:text-6xl font-bold mb-16">
                Works Just Like{" "}
                <SparklesText
                  sparklesCount={6}
                  text="Magic"
                  className="inline-block font-bold text-3xl md:text-6xl"
                />
              </div>
              <div className="relative flex w-full flex-col overflow-hidden h-[450px] sm:h-[550px]">
                <div ref={ref}>
                  {inView && (
                    <AnimatedList delay={500} className="text-left">
                      <figure className="relative mx-auto min-h-fit w-full max-w-[700px] cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-8 transition-all duration-300 ease-in-out hover:scale-[102%] border border-transparent hover:border-primary/20 bg-card dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
                        <div className="flex flex-row items-center gap-3 sm:gap-6">
                          <div className="flex size-16 sm:size-20 items-center justify-center rounded-[20%] transition-colors duration-300 bg-primary/20 p-2">
                            {isComplete ? (
                              <Check className="h-8 w-8 text-white" />
                            ) : (
                              <span className="text-3xl">📤</span>
                            )}
                          </div>
                          <div className="flex flex-col overflow-hidden w-full gap-2 sm:gap-3">
                            <div className="flex justify-between items-start w-full">
                              <figcaption className="text-lg sm:text-xl font-medium">
                                {isComplete
                                  ? "Files Sent Successfully"
                                  : "Sending Files..."}
                              </figcaption>
                              <span className="text-xs sm:text-sm text-muted-foreground shrink-0 ml-2 sm:ml-4">
                                Now
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-normal text-muted-foreground mb-2">
                              design-mockup.fig · 4.2 GB
                            </p>
                            <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-[1500ms] ease-in-out ${
                                  isComplete ? "bg-green-500" : "bg-primary"
                                }`}
                                style={{
                                  width: `${progress}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </figure>

                      <figure className="relative mx-auto min-h-fit w-full max-w-[700px] cursor-pointer overflow-hidden rounded-2xl p-8 transition-all duration-300 ease-in-out hover:scale-[102%] border border-transparent hover:border-primary/20 bg-card dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
                        <div className="flex flex-row items-center gap-6">
                          <div className="flex size-20 items-center justify-center rounded-[20%] bg-[#1E86FF] p-2">
                            <span className="text-3xl">📥</span>
                          </div>
                          <div className="flex flex-col overflow-hidden w-full gap-3">
                            <div className="flex justify-between items-start w-full">
                              <figcaption className="text-xl font-medium">
                                Files Received
                              </figcaption>
                              <span className="text-sm text-muted-foreground shrink-0 ml-4">
                                2m ago
                              </span>
                            </div>
                            <p className="text-sm font-normal text-muted-foreground">
                              project-files.zip · 156 MB
                            </p>
                          </div>
                        </div>
                      </figure>

                      <figure className="relative mx-auto min-h-fit w-full max-w-[700px] cursor-pointer overflow-hidden rounded-2xl p-8 transition-all duration-300 ease-in-out hover:scale-[102%] border border-transparent hover:border-primary/20 bg-card dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
                        <div className="flex flex-row items-center gap-6">
                          <div className="flex size-20 items-center justify-center rounded-[20%] bg-[#FFB800] p-2">
                            <span className="text-3xl">📥</span>
                          </div>
                          <div className="flex flex-col overflow-hidden w-full gap-3">
                            <div className="flex justify-between items-start w-full">
                              <figcaption className="text-xl font-medium">
                                Files Received
                              </figcaption>
                              <span className="text-sm text-muted-foreground shrink-0 ml-4">
                                5m ago
                              </span>
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
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 sm:h-1/3 bg-gradient-to-t from-background"></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-8 sm:py-12 md:py-24">
          <div className="px-3 sm:px-4 md:px-12 lg:px-24">
            <div className="text-center mb-8 sm:mb-10 md:mb-16">
              <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">
                Why Choose SwiftSend?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
                The fastest way to share files between devices
              </p>
            </div>
            <BentoGrid className="auto-rows-[12rem] sm:auto-rows-[15rem] md:auto-rows-[20rem] grid-cols-1 md:grid-cols-3 lg:grid-rows-3 gap-3 sm:gap-4">
              <BentoCard
                name="Lightning Fast"
                description="Transfer files at blazing speeds with our peer-to-peer technology. Experience instant file sharing like never before."
                Icon={Zap}
                className="col-span-1 md:col-span-2 lg:row-start-1 lg:row-end-3"
                background={
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                }
                href="/share"
                cta="Try it now"
              />
              <BentoCard
                name="Secure & Private"
                description="End-to-end encryption ensures your files stay private. Direct device-to-device transfer with no cloud storage."
                Icon={Shield}
                className="col-span-1 lg:row-start-3"
                background={
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                }
                href="/share"
                cta="Learn more"
              />
              <BentoCard
                name="No Limits"
                description="Share files of any size without restrictions. Perfect for large files, folders, and multiple items at once."
                Icon={Globe}
                className="col-span-1 lg:row-start-1"
                background={
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                }
                href="/share"
                cta="Start sharing"
              />
              <BentoCard
                name="Cross Platform"
                description="Works seamlessly across all devices and operating systems. Share between phones, tablets, and computers with ease."
                Icon={Share2}
                className="col-span-1 md:col-span-2 lg:row-start-3"
                background={
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                }
                href="/share"
                cta="Get started"
              />
              <BentoCard
                name="Real-time Notifications"
                description="Stay informed with instant notifications for file transfers, shares, and mentions. Never miss an important update."
                Icon={Bell}
                className="col-span-1 lg:row-start-2 lg:row-end-3"
                background={
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                }
                href="/share"
                cta="Enable notifications"
              />
            </BentoGrid>
          </div>
        </section>

        <section className="py-8 sm:py-12 md:py-24 bg-muted/30">
          <div className="px-3 sm:px-4 md:px-12 lg:px-24">
            <div className="text-center mb-8 sm:mb-10 md:mb-16">
              <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">
                How It Works
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
                Simple, fast, and secure file sharing
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-8">
              <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl bg-background p-4 sm:p-6 md:p-8 transition-all duration-300 border border-transparent hover:border-primary/30">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                    <Share2 className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">1. Connect</h3>
                  <p className="text-muted-foreground">
                    Enter the recipient's SwiftSend ID or let them scan your QR
                    code for an instant secure connection.
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl bg-background p-4 sm:p-6 md:p-8 transition-all duration-300 border border-transparent hover:border-primary/30">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                    <Send className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">
                    2. Select Files
                  </h3>
                  <p className="text-muted-foreground">
                    Choose any files you want to share - documents, images,
                    videos, or entire folders. No size limits.
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl bg-background p-4 sm:p-6 md:p-8 transition-all duration-300 border border-transparent hover:border-primary/30">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                    <Download className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">3. Transfer</h3>
                  <p className="text-muted-foreground">
                    Watch your files transfer in real-time with end-to-end
                    encryption and blazing-fast speeds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-20 md:py-32">
          <div className="px-4 sm:px-6 md:px-12 lg:px-24">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                Ready to Start Sharing?
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8">
                Join thousands of users who trust SwiftSend for their file
                sharing needs.
              </p>
              <Link
                href="/share"
                className="block w-full sm:w-auto sm:inline-block"
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 sm:py-8">
        <div className="px-4 sm:px-6 md:px-12 lg:px-24">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div
              className="font-semibold text-lg"
              style={{ fontFamily: "var(--font-oxanium)" }}
            >
              SwiftSend
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} SwiftSend. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
