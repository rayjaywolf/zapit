"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, Upload, File, Send, X, CheckCircle, Laptop, Download, Globe, AlertTriangle } from "lucide-react"
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
import { PeerError } from 'peerjs'
import Image from "next/image"
import { Logo } from "@/components/ui/logo"

type FileWithSize = {
    name: string
    size: number
    file: File
}

type TransferStatus = 'sending' | 'acknowledged' | 'complete' | 'error';

type UploadProgress = {
    progress: number
    uploaded: number // Bytes uploaded (approximated based on sent progress)
    speed: number // Transfer speed (bps)
    status: TransferStatus // Added status
    fileName: string // Track which file this progress belongs to
}

type DeviceInfo = {
    name: string
    version: number
}

export default function SharePage() {
    const [selectedFiles, setSelectedFiles] = useState<FileWithSize[]>([])
    // Store progress per file being sent
    const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, UploadProgress>>({});
    const [globalUploadState, setGlobalUploadState] = useState<'idle' | 'sending' | 'complete' | 'error'>('idle');
    // const [uploadSuccess, setUploadSuccess] = useState(false); // Replaced by globalUploadState
    const [uploadTime, setUploadTime] = useState(0)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({ name: "Unknown Device", version: 0 })
    const [peerIdInput, setPeerIdInput] = useState("")
    const [connectError, setConnectError] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadStartTimeRef = useRef<number | null>(null)
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectingToPeerId, setConnectingToPeerId] = useState<string | null>(null);
    const filesToSendRef = useRef<FileWithSize[]>([]); // Ref to track files currently being sent
    const completedFilesRef = useRef<Set<string>>(new Set()); // Track confirmed completed files
    const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for the timeout

    const {
        myPeerId,
        peers,
        connectToPeer,
        sendFile,
        isConnected,
        receivingFiles,
        connectionError: hookConnectionError, // Get error state from hook
        clearConnectionError // Get clear function from hook
    } = usePeerConnection()

    useEffect(() => {
        const detectDevice = () => {
            if (typeof window === 'undefined' || typeof navigator === 'undefined') {
                return { name: "Server", version: 0 }; // Handle SSR or environments without navigator
            }
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
                            version: parseFloat(version) || 0 // Ensure version is a number
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
                (window as any).opera ? 'opera' : '' // Check if window.opera exists
            ].filter(Boolean); // Filter out empty strings


            const agent = headerList.join(' ')
            const os = matchItem(agent, osData)
            // const browser = matchItem(agent, browserData); // Browser info if needed

            let deviceName = os.name
            if (os.name === 'iPhone' || os.name === 'iPad') {
                deviceName = os.version > 0 ? `${os.name} ${Math.floor(os.version)}` : os.name;
            } else if (os.name === 'Macintosh') {
                // Basic Mac detection
                deviceName = 'Mac';
                try {
                    if (window.screen.width <= 1440 && window.screen.height <= 900) {
                        deviceName = 'MacBook Air'; // Guess based on common Air resolution
                    } else if (window.screen.width > 1440 || window.screen.height > 900) {
                        deviceName = 'MacBook Pro'; // Guess based on common Pro resolution
                    } else {
                        deviceName = 'Mac'; // Default Mac if screen size is unusual
                    }
                } catch (e) {
                    deviceName = 'Mac'; // Fallback if screen access fails
                }

            } else if (os.name === 'Windows') {
                // Windows version detection based on NT version
                if (os.version >= 10.0) { // NT 10.0+ is typically Windows 10 or 11
                    // Further distinction between 10 and 11 via userAgentData is more reliable if available
                    // but navigator.userAgentData is experimental and might not be present.
                    // Simple approach: Check for "Windows 11" string specifically if needed, otherwise assume 10/11
                    if (navigator.userAgent.includes("Windows NT 11.0")) { // Unofficial but sometimes seen
                        deviceName = 'Windows 11';
                    } else if (navigator.userAgent.includes("Windows NT 10.0")) {
                        // Could check build number here if really needed (e.g., build 22000+ for 11)
                        deviceName = 'Windows 11/10'; // Can't reliably distinguish 10 vs 11 from NT 10.0 alone
                    } else {
                        deviceName = 'Windows 10+'
                    }
                }
                else if (os.version >= 6.3) deviceName = 'Windows 8.1';
                else if (os.version >= 6.2) deviceName = 'Windows 8';
                else if (os.version >= 6.1) deviceName = 'Windows 7';
                else if (os.version >= 6.0) deviceName = 'Windows Vista';
                else if (os.version >= 5.1) deviceName = 'Windows XP';
                else deviceName = 'Windows PC';

            } else if (os.name === 'Android') {
                deviceName = os.version > 0 ? `Android ${Math.floor(os.version)}` : 'Android';
            } else if (os.name === 'Linux') {
                // Could try to detect specific distro from userAgent but highly unreliable
                deviceName = 'Linux Desktop';
                if (agent.toLowerCase().includes('android')) {
                    deviceName = os.version > 0 ? `Android ${Math.floor(os.version)}` : 'Android'; // Reclassify if Android keyword found
                }
            }


            return { name: deviceName, version: os.version }
        }

        setDeviceInfo(detectDevice())
    }, [])

    // Effect to handle connection errors from the hook
    useEffect(() => {
        if (hookConnectionError) {
            console.log("Hook connection error detected:", hookConnectionError.type, hookConnectionError.message);
            let userMessage = `Connection error: ${hookConnectionError.message}`; // Default message

            // Customize message based on error type
            switch (hookConnectionError.type) {
                case 'peer-unavailable':
                    // Extract target peer ID if possible (might be in the message)
                    // This relies on the default message format, which isn't guaranteed
                    const match = hookConnectionError.message.match(/peer (\w+)/);
                    const targetPeer = match ? match[1] : connectingToPeerId || 'peer';
                    userMessage = `Peer ${targetPeer} could not be found or is offline. Please check the SwiftSend ID.`;
                    break;
                case 'network':
                    userMessage = "Network error. Please check your connection and try again.";
                    break;
                case 'server-error':
                case 'socket-error':
                case 'socket-closed':
                    userMessage = "Connection to server failed. Please try again later.";
                    break;
                case 'disconnected':
                    // This might be temporary, timeout handles persistent disconnection better
                    userMessage = "Disconnected from server. Attempting to reconnect...";
                    // Don't clear connecting state for temporary disconnection
                    setConnectError(userMessage); // Show temporary status
                    // toast.warn(userMessage); // Use warn toast
                    // clearConnectionError(); // Clear immediately as it might reconnect
                    // return; // Skip resetting connecting state for 'disconnected'
                    break;
                case 'unavailable-id':
                    // This is handled internally by the hook retrying, don't show user
                    clearConnectionError();
                    return;

            }

            // Update page state only for errors that should stop the connection attempt
            setConnectError(userMessage);
            toast.error(userMessage);

            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current); // Clear timeout
            setIsConnecting(false); // Stop connecting indicator
            setConnectingToPeerId(null); // Clear target ID

            clearConnectionError(); // Reset the error state in the hook
        }
    }, [hookConnectionError, clearConnectionError, connectingToPeerId]);

    // Effect to handle successful connection confirmation
    useEffect(() => {
        // Check if we were trying to connect and the target peer is now in the list
        if (connectingToPeerId && peers.some(p => p.id === connectingToPeerId)) {
            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current); // Clear timeout on success
            toast.success(`Successfully connected to ${connectingToPeerId}!`);
            setIsConnecting(false); // Connection resolved successfully
            setConnectingToPeerId(null); // Clear the target ID
            setConnectError(""); // Clear any previous errors (like timeout or transient errors)
        }
    }, [peers, connectingToPeerId]); // Depend on peers list and the ID we are tracking

    // Cleanup timeout on component unmount
    useEffect(() => {
        return () => {
            if (connectTimeoutRef.current) {
                clearTimeout(connectTimeoutRef.current);
            }
        };
    }, []);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"] // Added TB
        if (bytes < k) return bytes + " " + sizes[0];
        const i = Math.max(0, Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k))));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)) + " " + sizes[i]
    }

    const formatTime = (milliseconds: number) => {
        if (milliseconds < 0) return "0s";
        if (milliseconds < 1000) return `${milliseconds}ms`
        const seconds = milliseconds / 1000
        return seconds < 60
            ? `${seconds.toFixed(1)}s`
            : `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
    }

    const triggerConfetti = () => {
        const end = Date.now() + 3 * 1000 // 3 seconds
        const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]

        const frame = () => {
            if (Date.now() > end) return;

            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                startVelocity: 60,
                origin: { x: 0, y: 0.5 },
                colors: colors,
                scalar: 1.2, // Slightly larger particles
                ticks: 150 // Stay longer
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                startVelocity: 60,
                origin: { x: 1, y: 0.5 },
                colors: colors,
                scalar: 1.2,
                ticks: 150
            });

            requestAnimationFrame(frame);
        }
        frame()
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        setGlobalUploadState('idle'); // Reset state if new files are selected
        setUploadProgressMap({});
        completedFilesRef.current.clear();
        const files = event.target.files
        if (files) {
            const newFiles = Array.from(files).map(file => ({
                name: file.name,
                size: file.size,
                file
            }))
            setSelectedFiles(newFiles)
            // Clear the input value so selecting the same file again triggers onChange
            if (event.target) {
                event.target.value = '';
            }
        }
    }

    const handleRemoveFile = (index: number) => {
        const removedFileName = selectedFiles[index]?.name;
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
        // Also remove from progress map if it was being tracked
        if (removedFileName) {
            setUploadProgressMap(prev => {
                const newMap = { ...prev };
                delete newMap[removedFileName];
                return newMap;
            });
            completedFilesRef.current.delete(removedFileName);
        }

    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setGlobalUploadState('idle'); // Reset state
        setUploadProgressMap({});
        completedFilesRef.current.clear();
        const files = event.dataTransfer.files
        if (files && files.length > 0) {
            const newFiles = Array.from(files).map(file => ({
                name: file.name,
                size: file.size,
                file
            }))
            setSelectedFiles(newFiles)
        }
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault() // Necessary to allow drop
    }

    const handleConnect = async () => {
        setConnectError(""); // Clear previous *page-level* errors
        // We also clear the hook error via connectToPeer now
        if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current); // Clear any existing timeout

        // Validation checks
        if (!peerIdInput || peerIdInput.length !== 4) {
            setConnectError("Please enter a valid 4-character Peer ID")
            return
        }
        if (peerIdInput === myPeerId) {
            setConnectError("You cannot connect to yourself")
            return
        }

        const targetPeerId = peerIdInput; // Store the ID before clearing the input

        try {
            setIsConnecting(true); // Set connecting status
            setConnectingToPeerId(targetPeerId); // Track the ID we are attempting
            setPeerIdInput(""); // Clear input field immediately
            toast.info(`Attempting connection to ${targetPeerId}...`);

            await connectToPeer(targetPeerId); // Call the hook function

            // Set a timeout as a fallback mechanism
            connectTimeoutRef.current = setTimeout(() => {
                // Check if we are *still* connecting to the same peer after the timeout
                if (connectingToPeerId === targetPeerId) {
                    console.log(`Connection attempt to ${targetPeerId} timed out.`);
                    const timeoutErrorMessage = `Connection to ${targetPeerId} timed out. Peer may be unavailable or offline.`;
                    setConnectError(timeoutErrorMessage);
                    setIsConnecting(false);
                    setConnectingToPeerId(null); // Clear target ID on timeout
                    toast.error(timeoutErrorMessage);
                    // Optionally signal timeout to the hook if needed? For now, page handles timeout UI.
                }
            }, 15000); // 15-second timeout


        } catch (error: any) {
            // This catch block now primarily handles *immediate* errors from connectToPeer,
            // like "PeerJS not initialized" or "Cannot connect to self".
            // Asynchronous errors (like peer-unavailable) are handled by the useEffect watching hookConnectionError.
            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current); // Clear timeout on immediate error
            console.error("Immediate connection initiation failed:", error);

            // Use the error message directly if it's an Error object
            const errorMessage = error instanceof Error ? error.message : "Failed to initiate connection.";

            setConnectError(errorMessage);
            setIsConnecting(false); // Set connecting status false on error
            setConnectingToPeerId(null); // Clear the target ID
            toast.error(`Connection failed: ${errorMessage}`);
        }
    }

    // Central handler for checking if all files are complete
    const checkAllFilesComplete = () => {
        if (filesToSendRef.current.length === 0) return false; // Nothing to check
        const allComplete = filesToSendRef.current.every(file => completedFilesRef.current.has(file.name));
        console.log(`Checking completion: ${completedFilesRef.current.size}/${filesToSendRef.current.length} files complete. All complete: ${allComplete}`);
        return allComplete;
    };


    const handleSend = async () => {
        if (selectedFiles.length === 0 || peers.length === 0) return

        filesToSendRef.current = [...selectedFiles]; // Track files intended for this send operation
        completedFilesRef.current.clear(); // Clear previous completions
        setGlobalUploadState('sending');
        setUploadProgressMap({}); // Reset progress for the new batch
        setPopoverOpen(false) // Close popover if open
        uploadStartTimeRef.current = Date.now()
        const startTime = uploadStartTimeRef.current;
        let totalUploadedAcrossFiles = 0;


        const targetPeerId = peers[0].id; // Send to the first connected peer

        for (const fileToSend of filesToSendRef.current) {
            // Initialize progress for this file
            setUploadProgressMap(prev => ({
                ...prev,
                [fileToSend.name]: {
                    progress: 0,
                    uploaded: 0,
                    speed: 0,
                    status: 'sending',
                    fileName: fileToSend.name,
                }
            }));

            try {
                await sendFile(fileToSend.file, targetPeerId, (progress, status) => {
                    const currentTime = Date.now();
                    const elapsedSeconds = (currentTime - startTime) / 1000;

                    // Update progress specifically for this file
                    setUploadProgressMap(prev => {
                        const currentFileProgress = prev[fileToSend.name] || { uploaded: 0, speed: 0 };
                        const newlyUploadedForFile = (progress / 100) * fileToSend.size - (currentFileProgress.progress / 100 * fileToSend.size);

                        // Recalculate total uploaded across all files *being sent in this batch*
                        let currentTotalUploaded = 0;
                        Object.values(prev).forEach(p => {
                            // For the current file, use the new progress
                            if (p.fileName === fileToSend.name) {
                                currentTotalUploaded += (progress / 100) * fileToSend.size;
                            } else {
                                // For other files, use their last known progress
                                const otherFile = filesToSendRef.current.find(f => f.name === p.fileName);
                                if (otherFile) {
                                    currentTotalUploaded += (p.progress / 100) * otherFile.size;
                                }
                            }
                        });


                        const overallSpeed = elapsedSeconds > 0.1 ? Math.floor(currentTotalUploaded / elapsedSeconds) : 0; // Calculate speed based on total uploaded for the batch


                        return {
                            ...prev,
                            [fileToSend.name]: {
                                ...currentFileProgress,
                                progress: progress,
                                // uploaded: currentUploadedForFile, // Keep track of bytes for this file
                                speed: overallSpeed, // Show overall speed on all entries for simplicity
                                status: status,
                                fileName: fileToSend.name,
                            }
                        };
                    });


                    // Handle final completion or error for THIS file
                    if (status === 'complete') {
                        console.log(`${fileToSend.name} confirmed complete by receiver.`);
                        completedFilesRef.current.add(fileToSend.name);
                        // Check if ALL files are now complete
                        if (checkAllFilesComplete()) {
                            console.log("All files confirmed complete.");
                            setGlobalUploadState('complete');
                            const endTime = Date.now();
                            setUploadTime(endTime - startTime);
                            triggerConfetti();
                            toast.success("All files transferred successfully!");

                            setTimeout(() => {
                                // Reset UI after success
                                setGlobalUploadState('idle');
                                setSelectedFiles([]);
                                setUploadProgressMap({});
                                filesToSendRef.current = [];
                                completedFilesRef.current.clear();
                            }, 3000); // Increased delay to appreciate confetti
                        }
                    } else if (status === 'error') {
                        console.error(`Error transferring ${fileToSend.name}`);
                        setGlobalUploadState('error');
                        toast.error(`Error transferring ${fileToSend.name}.`);
                        // Decide if one error stops the whole batch? Current loop continues.
                        // Mark this file's progress as error state in the map
                        setUploadProgressMap(prev => ({
                            ...prev,
                            [fileToSend.name]: {
                                ...(prev[fileToSend.name] || {}), // Keep existing progress info if available
                                status: 'error',
                                progress: prev[fileToSend.name]?.progress || 0, // Keep last known progress
                                fileName: fileToSend.name,
                            }
                        }));
                        // No confetti or success timeout if any file errors
                    }
                });
            } catch (error: any) {
                console.error(`Failed to send file ${fileToSend.name}:`, error);
                setGlobalUploadState('error');
                toast.error(`Failed to send ${fileToSend.name}: ${error.message}`);
                // Update map to show error for this specific file
                setUploadProgressMap(prev => ({
                    ...prev,
                    [fileToSend.name]: {
                        progress: 0,
                        uploaded: 0,
                        speed: 0,
                        status: 'error',
                        fileName: fileToSend.name,
                    }
                }));
                // Stop sending further files if one fails critically? Or let it continue?
                // Let's break the loop for now on critical sendFile failure.
                break;
            }
        }

        // If the loop finishes but not all files are complete (e.g., waiting for ACKs), the state remains 'sending'.
        // If an error occurred mid-way, state is 'error'.
        console.log("Finished iterating through files to send.");


    }

    // Calculate overall progress (average percentage of files being sent)
    const overallProgressPercent = () => {
        if (globalUploadState !== 'sending' && globalUploadState !== 'error') return 0;
        const filesBeingSent = Object.values(uploadProgressMap);
        if (filesBeingSent.length === 0) return 0;
        const totalPercent = filesBeingSent.reduce((sum, p) => sum + p.progress, 0);
        return totalPercent / filesBeingSent.length;
    };

    // Calculate total size of files being sent
    const totalUploadSize = filesToSendRef.current.reduce((acc, file) => acc + file.size, 0);

    // Calculate total bytes uploaded based on individual file progress
    const totalBytesUploaded = Object.values(uploadProgressMap).reduce((acc, p) => {
        const fileMeta = filesToSendRef.current.find(f => f.name === p.fileName);
        const fileSize = fileMeta?.size || 0;
        return acc + (p.progress / 100) * fileSize;
    }, 0);

    // Get overall speed (use speed from the last updated progress entry for simplicity)
    const overallSpeedBps = Object.values(uploadProgressMap).pop()?.speed || 0;


    return (
        <WarpBackground className="p-0 overflow-y-hidden" gridColor="rgba(255, 255, 255, 0.2)" beamsPerSide={3}>
            <div className={`min-h-screen bg-background mx-0 md:mx-8 lg:mx-48 border-x ${popoverOpen ? 'relative' : ''}`}>
                {popoverOpen && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" />
                )}
                <header className={`relative top-0 z-50 w-full border-b border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-8 ${popoverOpen ? 'blur-sm' : ''}`}>
                    <div className="flex h-14 items-center justify-between">
                        <Logo />
                        <div className="flex items-center gap-1 md:gap-3">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1.5 text-xs md:text-sm px-2 py-1">
                                <Laptop className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                                <span className="hidden sm:inline truncate max-w-[100px] md:max-w-[150px]">{deviceInfo.name}</span>
                                <span className="sm:hidden">Device</span>
                            </Badge>
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1.5 text-xs md:text-sm px-2 py-1">
                                <span className="font-mono tracking-wider">SwiftSend ID: {myPeerId || "..."}</span>
                            </Badge>
                        </div>
                        {/* Dynamic Status Badge */}
                        <Badge
                            variant={isConnected && peers.length > 0 ? "secondary" : "outline"}
                            className={`
                             ${isConnected && peers.length > 0
                                    ? 'bg-green-500/10 text-green-600 border-green-500/30'
                                    : 'text-muted-foreground border-dashed'}
                             text-xs md:text-sm hidden sm:flex items-center gap-1 px-2 py-1
                         `}
                        >
                            {isConnected && peers.length > 0 ? (
                                <>
                                    <CheckCircle className="h-3 w-3" /> Ready to Share
                                </>
                            ) : (
                                "Not Connected"
                            )}

                        </Badge>
                    </div>
                </header>
                <main className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2"> {/* Adjusted grid definition */}
                    {/* Section 1: Connect */}
                    <div className="border-r border-b h-[calc((100vh-3.5rem)/2)]"> {/* Removed md:h-auto */}
                        <div className="h-full flex flex-col p-4 md:p-8">
                            <div className="flex items-center gap-3 mb-6 md:mb-8">
                                <div className="bg-primary/10 rounded-lg p-2">
                                    <Link className="h-5 w-5 text-primary" />
                                </div>
                                <h2 className="text-lg md:text-xl font-semibold tracking-tight">Connect to Peer</h2>
                            </div>
                            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-4 md:px-0">
                                <div className="space-y-3 md:space-y-4 w-full">
                                    <Input
                                        placeholder="Enter 4-character SwiftSend ID"
                                        value={peerIdInput}
                                        onChange={(e) => setPeerIdInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                        maxLength={4}
                                        className="text-base md:text-lg text-center tracking-widest h-11 md:h-12 font-mono disabled:opacity-50 placeholder:text-sm placeholder:text-muted-foreground/70"
                                        disabled={!myPeerId || isConnecting}
                                    />
                                    <Button
                                        onClick={handleConnect}
                                        disabled={!myPeerId || !peerIdInput || peerIdInput.length !== 4 || peerIdInput === myPeerId || isConnecting}
                                        className="w-full h-11 md:h-12 text-base"
                                    >
                                        {/* Show specific peer ID only while connecting */}
                                        {isConnecting && connectingToPeerId ? `Connecting to ${connectingToPeerId}...` : 'Connect'}
                                    </Button>
                                </div>
                                {/* Display the page-level connectError state */}
                                {connectError && (
                                    <p className="text-xs md:text-sm text-red-500 mt-2 text-center">{connectError}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Connected Peers */}
                    <div className="border-b h-[calc((100vh-3.5rem)/2)]"> {/* Removed md:h-auto */}
                        <div className="h-full flex flex-col p-4 md:p-8">
                            <div className="flex items-center gap-3 mb-6 md:mb-8">
                                <div className="bg-primary/10 rounded-lg p-2">
                                    <Globe className="h-5 w-5 text-primary" />
                                </div>
                                <h2 className="text-lg md:text-xl font-semibold tracking-tight">Connected Peers</h2>
                            </div>
                            <div className="flex-1 flex items-center justify-center w-full">
                                <ConnectedPeers peers={peers} />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Upload Area */}
                    <div className="border-r border-b md:border-b-0 h-[calc((100vh-3.5rem)/2)]" // Removed md:h-auto
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <div className="h-full flex flex-col p-4 md:p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-primary/10 rounded-lg p-2">
                                    <Upload className="h-5 w-5 text-primary" />
                                </div>
                                <h2 className="text-lg md:text-xl font-semibold tracking-tight">Select Files</h2>
                            </div>
                            <div className="flex-1 flex items-center justify-center w-full">
                                <div className="text-center w-full max-w-xs p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors duration-200">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                                        <Upload className="h-5 w-5 md:h-6 md:h-6 text-primary" />
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Drag & Drop or Click to Select
                                    </p>
                                    <div className="flex items-center gap-3 justify-center text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                                        <div className="h-px w-12 bg-border"></div>
                                        <span>or</span>
                                        <div className="h-px w-12 bg-border"></div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        multiple
                                        onChange={handleFileSelect}
                                    // Add accept attribute if you want to limit file types
                                    // accept="image/*, .pdf, .zip"
                                    />
                                    <Button
                                        variant="outline"
                                        size="default"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative h-9 md:h-10 text-sm"
                                    >
                                        <span className="relative z-10">Browse Files</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Selected Files / Progress */}
                    <div className="h-[calc((100vh-3.5rem)/2)]"> {/* Removed md:h-auto */}
                        <div className="h-full flex flex-col p-4 md:p-8">
                            {/* Header Area */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 rounded-lg p-2">
                                        {globalUploadState === 'sending' || globalUploadState === 'complete' || globalUploadState === 'error'
                                            ? <Send className="h-5 w-5 text-primary" />
                                            : <File className="h-5 w-5 text-primary" />
                                        }
                                    </div>
                                    <h2 className="text-lg md:text-xl font-semibold tracking-tight">
                                        {globalUploadState === 'sending' ? 'Sending Files...' :
                                            globalUploadState === 'complete' ? 'Transfer Complete!' :
                                                globalUploadState === 'error' ? 'Transfer Error' :
                                                    receivingFiles.length > 0 ? 'Receiving Files...' :
                                                        'Selected Files'}
                                    </h2>
                                </div>
                                {selectedFiles.length > 0 && globalUploadState === 'idle' && (
                                    <Button
                                        size="sm"
                                        className="gap-2 h-9 md:h-10 px-3 md:px-4 text-sm md:text-base"
                                        onClick={handleSend}
                                        disabled={peers.length === 0} // Disable if no peers connected
                                    >
                                        <Send className="h-4 w-4" />
                                        <span>Send ({selectedFiles.length})</span>
                                        {peers.length === 0 && <span className="text-xs">(No Peers)</span>}
                                    </Button>
                                )}
                            </div>

                            {/* Content Area (Progress or File List) */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {/* Sending Progress View */}
                                {(globalUploadState === 'sending' || globalUploadState === 'complete' || globalUploadState === 'error') && filesToSendRef.current.length > 0 ? (
                                    <div className="h-full flex flex-col justify-center space-y-4 md:space-y-6 px-2">
                                        {/* Overall Progress Bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-muted-foreground">
                                                    {globalUploadState === 'sending' ? `Sending ${filesToSendRef.current.length} file(s)...` :
                                                        globalUploadState === 'complete' ? `Sent ${filesToSendRef.current.length} file(s)` :
                                                            `Transfer failed`}
                                                </span>
                                                <span>{Math.round(overallProgressPercent())}%</span>
                                            </div>
                                            <Progress value={overallProgressPercent()} className={`h-2 ${globalUploadState === 'error' ? 'bg-red-500/30 [&>*]:bg-red-500' : ''}`} />
                                            <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
                                                <span>
                                                    {formatFileSize(totalBytesUploaded)} / {formatFileSize(totalUploadSize)}
                                                </span>
                                                <span>
                                                    {formatFileSize(overallSpeedBps)}/s
                                                    {globalUploadState === 'complete' && ` (Avg: ${formatTime(uploadTime)})`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Individual File Status (Optional - can be noisy) */}
                                        {/*
                                      <div className="text-xs text-muted-foreground space-y-1 max-h-[100px] overflow-y-auto">
                                           {filesToSendRef.current.map(f => (
                                               <div key={f.name} className="flex justify-between items-center">
                                                   <span className="truncate max-w-[60%]">{f.name}</span>
                                                   <span className={`font-medium ${uploadProgressMap[f.name]?.status === 'error' ? 'text-red-500' : ''}`}>
                                                        {uploadProgressMap[f.name] ? `${Math.round(uploadProgressMap[f.name].progress)}%` : 'Waiting...'}
                                                         {uploadProgressMap[f.name]?.status === 'complete' && <CheckCircle className="inline h-3 w-3 ml-1 text-green-500"/>}
                                                         {uploadProgressMap[f.name]?.status === 'error' && <AlertTriangle className="inline h-3 w-3 ml-1 text-red-500"/>}
                                                   </span>
                                               </div>
                                           ))}
                                      </div>
                                      */}

                                    </div>
                                ) : receivingFiles.length > 0 && globalUploadState === 'idle' ? (
                                    // Receiving Progress View
                                    <div className="h-full flex flex-col justify-center space-y-4 md:space-y-6 px-2 overflow-y-auto">
                                        {receivingFiles.map((file, index) => (
                                            <div key={`receiving-${file.name}-${index}`} className="space-y-2 border-b pb-3 last:border-b-0">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Download className="h-4 w-4 text-primary flex-shrink-0" />
                                                        <span className="font-medium truncate" title={file.name}>{file.name}</span>
                                                    </div>
                                                    <div className="font-medium flex-shrink-0 pl-2">
                                                        {Math.round((file.receivedChunks / file.totalChunks) * 100)}%
                                                    </div>
                                                </div>
                                                <Progress
                                                    value={(file.receivedChunks / file.totalChunks) * 100}
                                                    className="h-2"
                                                />
                                                <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
                                                    <span>From Peer</span> {/* Placeholder - could show peer ID if available */}
                                                    <div>
                                                        {formatFileSize(Math.floor((file.receivedChunks / file.totalChunks) * file.size))} / {formatFileSize(file.size)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // Selected Files List View
                                    <div className="h-full flex flex-col overflow-y-auto -mx-4 md:-mx-8">
                                        {selectedFiles.length > 0 ? (
                                            <Table>
                                                <TableHeader className="sticky top-0 bg-background z-10">
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead><div className="pl-4 md:pl-8">Name</div></TableHead>
                                                        <TableHead><div className="text-right">Size</div></TableHead>
                                                        <TableHead className="w-[50px]"><div className="pr-4 md:pr-8"></div></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedFiles.map((file, index) => (
                                                        <TableRow key={`${file.name}-${index}`} className="hover:bg-muted/50">
                                                            <TableCell>
                                                                <div className="pl-4 md:pl-8 font-medium max-w-[150px] md:max-w-[200px] lg:max-w-[250px] truncate" title={file.name}>
                                                                    {file.name}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-right text-muted-foreground text-xs md:text-sm">
                                                                    {formatFileSize(file.size)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="pr-4 md:pr-8 flex justify-end">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
                                                                        onClick={() => handleRemoveFile(index)}
                                                                    >
                                                                        <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                                                No files selected
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </WarpBackground>
    )
}