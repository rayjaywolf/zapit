import { useState, useEffect, useCallback, useRef } from 'react'
import { Peer, DataConnection } from 'peerjs'
import { toast } from "sonner"

type PeerConnection = {
    id: string
    connection: DataConnection
    lastSeen: number
}

// Add a type for receiving files to be exported
export type ReceivingFile = {
    name: string
    size: number
    chunks: Array<ArrayBuffer>
    receivedChunks: number
    totalChunks: number
}

// Track outgoing file transfers
type OutgoingFileTransfer = {
    fileName: string
    peerId: string
    totalChunks: number
    sentChunks: number
    acknowledgedChunks: number
    onProgress: (progress: number) => void
}

type UsePeerConnectionReturn = {
    myPeerId: string
    peers: PeerConnection[]
    connectToPeer: (peerId: string) => Promise<void>
    sendFile: (file: File, peerId: string, onProgress: (progress: number) => void) => Promise<void>
    isConnected: boolean
    receivingFiles: ReceivingFile[] // Expose the receiving files state
}

export const usePeerConnection = (): UsePeerConnectionReturn => {
    const [myPeerId, setMyPeerId] = useState('')
    const [peers, setPeers] = useState<PeerConnection[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [peerInstance, setPeerInstance] = useState<Peer | null>(null)
    const [receivingFiles, setReceivingFiles] = useState<ReceivingFile[]>([])

    // Use a ref to track outgoing file transfers
    const outgoingTransfersRef = useRef<Record<string, OutgoingFileTransfer>>({})

    // Use useRef for the connectionListenersMap to ensure it persists across renders
    const connectionListenersMapRef = useRef(new WeakMap<DataConnection, boolean>())

    const generateShortId = useCallback(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }, [])

    // Generate a unique transfer ID
    const getTransferId = (fileName: string, peerId: string) => {
        return `${fileName}_${peerId}`
    }

    const handleIncomingData = useCallback((data: any) => {
        console.log("handleIncomingData called with:", data.type);

        if (data.type === 'file-start') {
            console.log("Received file-start:", data.fileName);
            setReceivingFiles(prev => [...prev, {
                name: data.fileName,
                size: data.fileSize,
                chunks: [],
                receivedChunks: 0,
                totalChunks: data.totalChunks,
            }])
        } else if (data.type === 'file-chunk') {
            console.log("Received file-chunk:", data.fileName, data.chunkIndex);
            // Find the peer who sent this
            const peer = peers.find(p => p.connection === data.connection || p.id === data.senderId);

            setReceivingFiles(prev => {
                return prev.map(file => {
                    if (file.name === data.fileName) {
                        const updatedChunks = [...file.chunks]
                        updatedChunks[data.chunkIndex] = data.chunk

                        // Send an acknowledgment back to the sender
                        if (peer?.connection) {
                            peer.connection.send({
                                type: 'chunk-ack',
                                fileName: data.fileName,
                                chunkIndex: data.chunkIndex
                            })
                        }

                        return {
                            ...file,
                            chunks: updatedChunks,
                            receivedChunks: file.receivedChunks + 1,
                        }
                    }
                    return file
                })
            })
        } else if (data.type === 'file-end') {
            console.log("Received file-end:", data.fileName);
            setReceivingFiles(prev => {
                const fileIndex = prev.findIndex(f => f.name === data.fileName)
                if (fileIndex === -1) return prev

                const file = prev[fileIndex]
                if (file.receivedChunks === file.totalChunks) {
                    const blob = new Blob(file.chunks)
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = file.name
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)

                    // Show a toast notification
                    toast.success(`Downloaded ${file.name} (${formatFileSize(file.size)})`)

                    // Send final acknowledgment
                    const peer = peers.find(p => p.connection === data.connection || p.id === data.senderId);
                    if (peer?.connection) {
                        peer.connection.send({
                            type: 'file-ack',
                            fileName: data.fileName,
                            status: 'complete'
                        })
                    }
                }

                return prev.filter((_, i) => i !== fileIndex)
            })
        } else if (data.type === 'chunk-ack') {
            // Handle chunk acknowledgment from receiver
            const transferId = getTransferId(data.fileName, data.connection?.peer || '');
            const transfer = outgoingTransfersRef.current[transferId];

            if (transfer) {
                transfer.acknowledgedChunks += 1;
                const progress = (transfer.acknowledgedChunks / transfer.totalChunks) * 100;
                transfer.onProgress(progress);

                // Update the transfer in the ref
                outgoingTransfersRef.current[transferId] = transfer;
            }
        } else if (data.type === 'file-ack' && data.status === 'complete') {
            // Handle final file acknowledgment
            const transferId = getTransferId(data.fileName, data.connection?.peer || '');
            delete outgoingTransfersRef.current[transferId];
            console.log(`File transfer ${transferId} completed and acknowledged`);
        }
    }, [peers])

    // Set up a function to safely add data event listeners exactly once per connection
    const setupConnectionListeners = useCallback((conn: DataConnection) => {
        const map = connectionListenersMapRef.current;

        if (!map.has(conn)) {
            conn.on('data', (data: any) => {
                // Attach connection information to the data
                handleIncomingData({
                    ...data,
                    connection: conn,
                    senderId: conn.peer
                });
            });
            map.set(conn, true);
            console.log(`Set up listeners for connection with ${conn.peer}`);
            return true;
        } else {
            console.log(`Skipped duplicate listeners for connection with ${conn.peer}`);
            return false;
        }
    }, [handleIncomingData]);

    useEffect(() => {
        const initializePeer = () => {
            const shortId = generateShortId()
            const peer = new Peer(shortId, {
                debug: 0,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
            })

            peer.on('open', (id) => {
                setMyPeerId(id)
                setPeerInstance(peer)
            })

            peer.on('connection', (conn) => {
                // Use the helper function to set up listeners
                setupConnectionListeners(conn);

                setPeers(prev => {
                    const existingPeerIndex = prev.findIndex(p => p.id === conn.peer)
                    if (existingPeerIndex === -1) {
                        return [...prev, { id: conn.peer, connection: conn, lastSeen: Date.now() }]
                    }
                    const newPeers = [...prev]
                    newPeers[existingPeerIndex] = { id: conn.peer, connection: conn, lastSeen: Date.now() }
                    return newPeers
                })

                setIsConnected(true)
            })

            peer.on('error', (err) => {
                if (err.type !== 'peer-unavailable') {
                    console.error('Peer error:', err)
                }
            })
        }

        initializePeer()

        return () => {
            peerInstance?.destroy()
        }
    }, [generateShortId, setupConnectionListeners])

    const connectToPeer = useCallback(async (peerId: string) => {
        if (!peerInstance) return

        try {
            const conn = peerInstance.connect(peerId, {
                reliable: true,
                metadata: { sender: myPeerId }
            })

            conn.on('open', () => {
                // Use the helper function to set up listeners
                setupConnectionListeners(conn);

                setPeers(prev => {
                    const existingPeerIndex = prev.findIndex(p => p.id === peerId)
                    if (existingPeerIndex === -1) {
                        return [...prev, { id: peerId, connection: conn, lastSeen: Date.now() }]
                    }
                    const newPeers = [...prev]
                    newPeers[existingPeerIndex] = { id: peerId, connection: conn, lastSeen: Date.now() }
                    return newPeers
                })

                setIsConnected(true)
            })

            conn.on('error', (err) => {
                console.error('Connection error:', err)
                setIsConnected(false)
            })
        } catch (error) {
            console.error('Connection error:', error)
            setIsConnected(false)
        }
    }, [peerInstance, myPeerId, setupConnectionListeners])

    const sendFile = useCallback(async (file: File, peerId: string, onProgress: (progress: number) => void) => {
        const peer = peers.find(p => p.id === peerId)
        if (!peer?.connection) return

        const chunkSize = 64000
        const totalChunks = Math.ceil(file.size / chunkSize)
        const transferId = getTransferId(file.name, peerId)

        // Initialize the transfer tracking
        outgoingTransfersRef.current[transferId] = {
            fileName: file.name,
            peerId,
            totalChunks,
            sentChunks: 0,
            acknowledgedChunks: 0,
            onProgress
        }

        const sendChunk = async (chunkIndex: number) => {
            const start = chunkIndex * chunkSize
            const end = Math.min(start + chunkSize, file.size)
            const chunk = await file.slice(start, end).arrayBuffer()

            return new Promise<void>((resolve) => {
                const trySend = () => {
                    try {
                        peer.connection.send({
                            type: 'file-chunk',
                            chunk,
                            totalChunks,
                            chunkIndex,
                            fileName: file.name
                        })

                        // Update sent chunks count
                        const transfer = outgoingTransfersRef.current[transferId];
                        if (transfer) {
                            transfer.sentChunks += 1;
                            outgoingTransfersRef.current[transferId] = transfer;
                        }

                        resolve()
                    } catch (error) {
                        setTimeout(trySend, 50)
                    }
                }
                trySend()
            })
        }

        peer.connection.send({
            type: 'file-start',
            fileName: file.name,
            totalChunks,
            fileSize: file.size
        })

        // Send initial progress to show file transfer has started
        onProgress(0);

        // Queue all chunks to be sent
        for (let i = 0; i < totalChunks; i++) {
            await sendChunk(i)

            // Only update UI with a throttled progress based on sent chunks
            // The real progress (acknowledged chunks) will be updated via chunk-ack messages
            if (i % Math.max(1, Math.floor(totalChunks / 10)) === 0) {
                // This is just a UI progress indicator for sent chunks
                // The final accurate progress comes from chunk-ack
                const sentProgress = ((i + 1) / totalChunks) * 100
                // This caps progress at 90% until we get all acknowledgments
                const cappedProgress = Math.min(sentProgress, 90)
                onProgress(cappedProgress)
            }
        }

        peer.connection.send({
            type: 'file-end',
            fileName: file.name,
        })

        // Set up a timeout to check for successful transfer completion
        const checkTransferComplete = () => {
            const transfer = outgoingTransfersRef.current[transferId];
            if (transfer) {
                if (transfer.acknowledgedChunks >= transfer.totalChunks) {
                    // All chunks acknowledged, transfer complete
                    onProgress(100);
                    delete outgoingTransfersRef.current[transferId];
                } else {
                    // Still waiting for acknowledgments
                    setTimeout(checkTransferComplete, 500);
                }
            }
        };

        setTimeout(checkTransferComplete, 500);
    }, [peers])

    // Helper function to format file sizes
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    return {
        myPeerId,
        peers,
        connectToPeer,
        sendFile,
        isConnected,
        receivingFiles
    }
} 