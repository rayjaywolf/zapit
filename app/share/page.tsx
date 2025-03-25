"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, Upload, File, Send, X, CheckCircle, Laptop, Download } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { WarpBackground } from "@/components/magicui/warp-background"
import confetti from "canvas-confetti"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useState, useRef, useEffect } from "react"
import { usePeerConnection, ReceivingFile } from "@/hooks/usePeerConnection"
import { ConnectedPeers } from "@/components/ConnectedPeers"
import { toast } from "sonner"

type FileWithSize = {
    name: string
    size: number
    file: File
}

type UploadProgress = {
    progress: number
    uploaded: number
    speed: number
}

type DeviceInfo = {
    name: string
    version: number
}

export default function SharePage() {
    const [selectedFiles, setSelectedFiles] = useState<FileWithSize[]>([])
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
    const [uploadSuccess, setUploadSuccess] = useState(false)
    const [uploadTime, setUploadTime] = useState(0)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({ name: "Unknown Device", version: 0 })
    const [peerIdInput, setPeerIdInput] = useState("")
    const [connectError, setConnectError] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadStartTimeRef = useRef<number | null>(null)
    const [connectionSuccess, setConnectionSuccess] = useState(false)

    const { myPeerId, peers, connectToPeer, sendFile, isConnected, receivingFiles } = usePeerConnection()

    useEffect(() => {
        const detectDevice = () => {
            const osData = [
                { name: 'Windows Phone', value: 'Windows Phone', version: 'OS' },
                { name: 'Windows', value: 'Win', version: 'NT' },
                { name: 'iPhone', value: 'iPhone', version: 'OS' },
                { name: 'iPad', value: 'iPad', version: 'OS' },
                { name: 'Kindle', value: 'Silk', version: 'Silk' },
                { name: 'Android', value: 'Android', version: 'Android' },
                { name: 'PlayBook', value: 'PlayBook', version: 'OS' },
                { name: 'BlackBerry', value: 'BlackBerry', version: '/' },
                { name: 'Macintosh', value: 'Mac', version: 'OS X' },
                { name: 'Linux', value: 'Linux', version: 'rv' },
                { name: 'Palm', value: 'Palm', version: 'PalmOS' }
            ]

            const browserData = [
                { name: 'Chrome', value: 'Chrome', version: 'Chrome' },
                { name: 'Firefox', value: 'Firefox', version: 'Firefox' },
                { name: 'Safari', value: 'Safari', version: 'Version' },
                { name: 'Internet Explorer', value: 'MSIE', version: 'MSIE' },
                { name: 'Opera', value: 'Opera', version: 'Opera' },
                { name: 'BlackBerry', value: 'CLDC', version: 'CLDC' },
                { name: 'Mozilla', value: 'Mozilla', version: 'Mozilla' }
            ]

            const matchItem = (string: string, data: any[]) => {
                for (let i = 0; i < data.length; i++) {
                    const regex = new RegExp(data[i].value, 'i')
                    const match = regex.test(string)

                    if (match) {
                        const regexv = new RegExp(data[i].version + '[- /:;]([\\d._]+)', 'i')
                        const matches = string.match(regexv)
                        let version = ''

                        if (matches && matches[1]) {
                            const parts = matches[1].split(/[._]+/)
                            for (let j = 0; j < parts.length; j++) {
                                if (j === 0) {
                                    version += parts[j] + '.'
                                } else {
                                    version += parts[j]
                                }
                            }
                        } else {
                            version = '0'
                        }

                        return {
                            name: data[i].name,
                            version: parseFloat(version)
                        }
                    }
                }

                return { name: 'unknown', version: 0 }
            }

            const headerList = [
                navigator.platform,
                navigator.userAgent,
                navigator.appVersion,
                navigator.vendor,
                'opera' in window ? 'opera' : ''
            ]

            const agent = headerList.join(' ')
            const os = matchItem(agent, osData)

            let deviceName = os.name
            if (os.name === 'iPhone' || os.name === 'iPad') {
                deviceName = `${os.name} ${Math.floor(os.version)}`
            } else if (os.name === 'Macintosh') {
                deviceName = 'MacBook'

                if (window.screen.width <= 1440 && window.screen.height <= 900) {
                    deviceName = 'MacBook Air'
                } else {
                    deviceName = 'MacBook Pro'
                }
            } else if (os.name === 'Windows') {
                if (os.version >= 10) {
                    deviceName = 'Windows 11'
                } else if (os.version >= 6.3) {
                    deviceName = 'Windows 10'
                } else if (os.version >= 6.2) {
                    deviceName = 'Windows 8'
                } else if (os.version >= 6.1) {
                    deviceName = 'Windows 7'
                } else {
                    deviceName = 'Windows PC'
                }
            } else if (os.name === 'Android') {
                deviceName = `Android ${Math.floor(os.version)}`
            }

            return { name: deviceName, version: os.version }
        }

        setDeviceInfo(detectDevice())
    }, [])

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    const formatTime = (milliseconds: number) => {
        if (milliseconds < 1000) return `${milliseconds}ms`
        const seconds = milliseconds / 1000
        return seconds < 60
            ? `${seconds.toFixed(1)}s`
            : `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
    }

    const triggerConfetti = () => {
        const end = Date.now() + 3 * 1000
        const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]

        const frame = () => {
            if (Date.now() > end) return

            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                startVelocity: 60,
                origin: { x: 0, y: 0.5 },
                colors: colors,
            })
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                startVelocity: 60,
                origin: { x: 1, y: 0.5 },
                colors: colors,
            })

            requestAnimationFrame(frame)
        }

        frame()
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files) {
            const newFiles = Array.from(files).map(file => ({
                name: file.name,
                size: file.size,
                file
            }))
            setSelectedFiles(newFiles)
        }
    }

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        const files = event.dataTransfer.files
        if (files) {
            const newFiles = Array.from(files).map(file => ({
                name: file.name,
                size: file.size,
                file
            }))
            setSelectedFiles(newFiles)
        }
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
    }

    const handleConnect = async () => {
        if (!peerIdInput || peerIdInput.length !== 4) {
            setConnectError("Please enter a valid 4-character Peer ID")
            return
        }

        try {
            await connectToPeer(peerIdInput)
            setConnectError("")
            setPeerIdInput("")
            setConnectionSuccess(true)
            toast.success(`Connected to peer ${peerIdInput}`)
        } catch (error) {
            setConnectError("Failed to connect. Please check the Peer ID and try again.")
            toast.error("Failed to connect to peer")
        }
    }

    const handleSend = async () => {
        if (selectedFiles.length === 0 || peers.length === 0) return

        setUploadSuccess(false)
        setPopoverOpen(false)
        uploadStartTimeRef.current = Date.now()

        const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0)
        let uploaded = 0

        for (const file of selectedFiles) {
            await sendFile(file.file, peers[0].id, (progress) => {
                uploaded = (progress / 100) * totalSize
                setUploadProgress({
                    progress,
                    uploaded,
                    speed: 4096 * 1024
                })
            })
        }

        const endTime = Date.now()
        const timeElapsed = endTime - (uploadStartTimeRef.current || 0)
        setUploadTime(timeElapsed)
        setUploadSuccess(true)
        triggerConfetti()

        setTimeout(() => {
            setUploadProgress(null)
            setSelectedFiles([])
        }, 2000)
    }

    return (
        <div className={`min-h-screen bg-background mx-0 md:mx-8 lg:mx-48 border-x ${popoverOpen ? 'relative' : ''}`}>
            {popoverOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" />
            )}
            <header className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-8 ${popoverOpen ? 'blur-sm' : ''}`}>
                <div className="flex h-14 items-center justify-between">
                    <div className="font-semibold text-lg">Zapit</div>
                    <div className="flex items-center gap-1 md:gap-3">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1.5 text-xs md:text-sm">
                            <Laptop className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            <span className="hidden sm:inline">{deviceInfo.name}</span>
                        </Badge>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80 text-xs md:text-sm">
                            Zap ID: {myPeerId || "Connecting..."}
                        </Badge>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 text-xs md:text-sm hidden sm:flex">
                        Ready to Share
                    </Badge>
                </div>
            </header>
            <main className="flex flex-col gap-4 md:gap-8 py-4 md:py-8 px-4 md:px-0">
                <Card className="w-full max-w-md mx-auto">
                    <CardContent className="pt-0">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <Link className="h-5 w-5 text-muted-foreground" />
                                <h2 className="text-lg font-semibold">Connect to Peer</h2>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter 4-character Peer ID"
                                    value={peerIdInput}
                                    onChange={(e) => setPeerIdInput(e.target.value.toUpperCase())}
                                    maxLength={4}
                                    className="text-sm md:text-base"
                                />
                                <Button onClick={handleConnect} disabled={!peerIdInput || peerIdInput.length !== 4}>
                                    Connect
                                </Button>
                            </div>
                            {connectError && (
                                <p className="text-sm text-red-500">{connectError}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <ConnectedPeers peers={peers} />

                {uploadSuccess ? (
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full max-w-md mx-auto flex items-center gap-2"
                            >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Upload Complete
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[90vw] md:w-96 p-4 md:p-6 z-50">
                            <div className="flex flex-col gap-4 md:gap-6">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                    <h3 className="text-lg md:text-xl font-medium">Upload Successful!</h3>
                                </div>
                                <div className="space-y-2 text-muted-foreground">
                                    <p className="text-sm md:text-base">Successfully sent {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}</p>
                                    <p className="text-sm md:text-base">Total size: {formatFileSize(selectedFiles.reduce((acc, file) => acc + file.size, 0))}</p>
                                    <p className="text-sm md:text-base">Time taken: {formatTime(uploadTime)}</p>
                                </div>
                                <Button
                                    onClick={() => {
                                        setSelectedFiles([])
                                        setUploadSuccess(false)
                                        setPopoverOpen(false)
                                    }}
                                    className="w-full"
                                >
                                    Upload More Files
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                ) : selectedFiles.length > 0 && (
                    <Card className="w-full max-w-md mx-auto">
                        <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6 py-3 md:py-4">
                            <div className="flex items-center gap-2">
                                <File className="h-5 w-5 text-muted-foreground" />
                                <CardTitle className="text-base md:text-lg">Selected Files</CardTitle>
                            </div>
                            <Button size="sm" className="gap-2" onClick={handleSend}>
                                <Send className="h-4 w-4" />
                                <span className="hidden sm:inline">Send</span>
                            </Button>
                        </CardHeader>
                        <CardContent className="px-4 md:px-6">
                            {uploadProgress ? (
                                <WarpBackground
                                    gridColor="#1d1d1d"
                                >
                                    <Card className="w-full">
                                        <CardContent className="flex flex-col gap-4 p-4 md:p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-muted-foreground">
                                                    {uploadProgress.progress < 100
                                                        ? "Transferring to peer..."
                                                        : "Transfer complete!"}
                                                </div>
                                                <div className="text-sm font-medium">{Math.round(uploadProgress.progress)}%</div>
                                            </div>
                                            <Progress value={uploadProgress.progress} className="h-2" />
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="text-muted-foreground">
                                                    {formatFileSize(uploadProgress.uploaded)} / {formatFileSize(selectedFiles.reduce((acc, file) => acc + file.size, 0))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </WarpBackground>
                            ) : (
                                <div className="overflow-x-auto -mx-4 px-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead className="text-right">Size</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedFiles.map((file, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium max-w-[150px] sm:max-w-none truncate">{file.name}</TableCell>
                                                    <TableCell className="text-right">{formatFileSize(file.size)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleRemoveFile(index)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card
                    className="w-full max-w-md mx-auto border-dashed"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    <CardContent className="pt-0">
                        <div className="flex flex-col items-center justify-center gap-4 pt-0">
                            <Upload className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground" />
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-2">
                                    Drag and drop your files here
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    or
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    multiple
                                    onChange={handleFileSelect}
                                />
                                <Button
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Select files
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {uploadSuccess && (
                    <div className="fixed bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 w-[90%] md:w-full max-w-2xl bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-3 md:p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 md:h-5 w-4 md:w-5 text-green-500" />
                                <span className="font-medium text-sm md:text-base">Upload Complete!</span>
                            </div>
                            <span className="text-xs md:text-sm text-gray-500">
                                Time: {formatTime(uploadTime)}
                            </span>
                        </div>
                    </div>
                )}

                {receivingFiles.length > 0 && (
                    <Card className="w-full max-w-md mx-auto">
                        <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6 py-3 md:py-4">
                            <div className="flex items-center gap-2">
                                <Download className="h-5 w-5 text-blue-500" />
                                <CardTitle className="text-base md:text-lg">Receiving Files</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 md:px-6">
                            {receivingFiles.map((file, index) => (
                                <div key={`receiving-${file.name}-${index}`} className="mb-4">
                                    <WarpBackground
                                        gridColor="#1d1d1d"
                                    >
                                        <Card className="w-full">
                                            <CardContent className="flex flex-col gap-4 p-4 md:p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-muted-foreground max-w-[150px] sm:max-w-none truncate">
                                                        {(file.receivedChunks / file.totalChunks) * 100 < 100
                                                            ? `Receiving ${file.name}...`
                                                            : `Completed ${file.name}`}
                                                    </div>
                                                    <div className="text-sm font-medium">
                                                        {Math.round((file.receivedChunks / file.totalChunks) * 100)}%
                                                    </div>
                                                </div>
                                                <Progress
                                                    value={(file.receivedChunks / file.totalChunks) * 100}
                                                    className="h-2"
                                                />
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="text-muted-foreground">
                                                        {formatFileSize(Math.floor((file.receivedChunks / file.totalChunks) * file.size))} / {formatFileSize(file.size)}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </WarpBackground>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    )
} 