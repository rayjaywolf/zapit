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

    const handleIncomingData = useCallback((data: any) => {
        console.log("handleIncomingData called with:", data);

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
            setReceivingFiles(prev => {
                return prev.map(file => {
                    if (file.name === data.fileName) {
                        const updatedChunks = [...file.chunks]
                        updatedChunks[data.chunkIndex] = data.chunk

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
                }

                return prev.filter((_, i) => i !== fileIndex)
            })
        }
    }, [])

    // Set up a function to safely add data event listeners exactly once per connection
    const setupConnectionListeners = useCallback((conn: DataConnection) => {
        const map = connectionListenersMapRef.current;

        if (!map.has(conn)) {
            conn.on('data', handleIncomingData);
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

        for (let i = 0; i < totalChunks; i++) {
            await sendChunk(i)
            const progress = ((i + 1) / totalChunks) * 100
            onProgress(progress)
        }

        peer.connection.send({
            type: 'file-end',
            fileName: file.name,
        })
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
        receivingFiles // Expose the receiving files
    }
} 