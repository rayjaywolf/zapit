import { useState, useEffect, useCallback, useRef } from 'react'
import { Peer, DataConnection } from 'peerjs'
import { toast } from "sonner"

type PeerConnection = {
    id: string
    connection: DataConnection
    lastSeen: number
}

export type ReceivingFile = {
    name: string
    size: number
    chunks: Array<ArrayBuffer>
    receivedChunks: number
    totalChunks: number
}

type TransferStatus = 'sending' | 'acknowledged' | 'complete' | 'error';

type OutgoingFileTransfer = {
    fileName: string
    peerId: string
    totalChunks: number
    sentChunks: number
    acknowledgedChunks: number
    onProgress: (progress: number, status: TransferStatus) => void
    isCompleteConfirmed: boolean // Flag for final receiver confirmation
}

type UsePeerConnectionReturn = {
    myPeerId: string
    peers: PeerConnection[]
    connectToPeer: (peerId: string) => Promise<void>
    sendFile: (file: File, peerId: string, onProgress: (progress: number, status: TransferStatus) => void) => Promise<void>
    isConnected: boolean
    receivingFiles: ReceivingFile[]
}

export const usePeerConnection = (): UsePeerConnectionReturn => {
    const [myPeerId, setMyPeerId] = useState('')
    const [peers, setPeers] = useState<PeerConnection[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [peerInstance, setPeerInstance] = useState<Peer | null>(null)
    const [receivingFiles, setReceivingFiles] = useState<ReceivingFile[]>([])
    const outgoingTransfersRef = useRef<Record<string, OutgoingFileTransfer>>({})
    const connectionListenersMapRef = useRef(new WeakMap<DataConnection, boolean>())

    const generateShortId = useCallback(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }, [])

    const getTransferId = (fileName: string, peerId: string) => {
        return `${fileName}_${peerId}`
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    const handleIncomingData = useCallback((data: any, sourceConnection: DataConnection) => {
        console.log("handleIncomingData called with type:", data.type, "from peer:", sourceConnection.peer);
        const senderId = sourceConnection.peer; // Get sender ID from the connection

        if (data.type === 'file-start') {
            console.log("Received file-start:", data.fileName, "size:", data.fileSize, "chunks:", data.totalChunks);
            setReceivingFiles(prev => {
                // Avoid duplicates if start message is resent
                if (prev.some(f => f.name === data.fileName)) {
                    return prev;
                }
                return [...prev, {
                    name: data.fileName,
                    size: data.fileSize,
                    chunks: new Array(data.totalChunks), // Pre-allocate array for direct indexing
                    receivedChunks: 0,
                    totalChunks: data.totalChunks,
                }];
            })
        } else if (data.type === 'file-chunk') {
            // console.log("Received file-chunk:", data.fileName, "index:", data.chunkIndex);
            setReceivingFiles(prev => {
                return prev.map(file => {
                    if (file.name === data.fileName && !file.chunks[data.chunkIndex]) { // Process only if chunk not already received
                        const updatedChunks = [...file.chunks]
                        updatedChunks[data.chunkIndex] = data.chunk

                        // Send acknowledgment back to the sender
                        try {
                            sourceConnection.send({
                                type: 'chunk-ack',
                                fileName: data.fileName,
                                chunkIndex: data.chunkIndex
                            });
                        } catch (error) {
                            console.error(`Error sending chunk-ack for ${data.fileName} index ${data.chunkIndex}:`, error);
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
                if (fileIndex === -1) {
                    console.warn(`Received file-end for unknown file: ${data.fileName}`);
                    return prev;
                }

                const file = prev[fileIndex]
                console.log(`File end check: ${file.name}, Received ${file.receivedChunks}/${file.totalChunks} chunks`);

                // Ensure all chunks are actually received before processing
                if (file.receivedChunks === file.totalChunks && file.chunks.every(chunk => chunk !== undefined)) {
                    console.log(`Assembling file: ${file.name}`);
                    const blob = new Blob(file.chunks)
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = file.name
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)

                    toast.success(`Downloaded ${file.name} (${formatFileSize(file.size)})`)

                    // Send final acknowledgment
                    try {
                        sourceConnection.send({
                            type: 'file-ack',
                            fileName: data.fileName,
                            status: 'complete'
                        });
                        console.log(`Sent final file-ack for ${data.fileName}`);
                    } catch (error) {
                        console.error(`Error sending final file-ack for ${data.fileName}:`, error);
                    }


                    // Remove the file from the receiving list
                    return prev.filter((_, i) => i !== fileIndex)
                } else {
                    console.warn(`File-end received for ${file.name}, but not all chunks are present. Received: ${file.receivedChunks}/${file.totalChunks}. Retaining file in list.`);
                    // Optionally request missing chunks or wait longer? For now, just log.
                    // Maybe send back an error ack?
                    try {
                        sourceConnection.send({
                            type: 'file-ack',
                            fileName: data.fileName,
                            status: 'incomplete' // Indicate an issue on receiver side
                        });
                    } catch (error) {
                        console.error(`Error sending incomplete file-ack for ${data.fileName}:`, error);
                    }
                }
                return prev; // Return unmodified list if not complete or index not found
            })
        } else if (data.type === 'chunk-ack') {
            // console.log(`Received chunk-ack for ${data.fileName}, index ${data.chunkIndex} from ${senderId}`);
            const transferId = getTransferId(data.fileName, senderId);
            const transfer = outgoingTransfersRef.current[transferId];

            if (transfer && !transfer.isCompleteConfirmed) { // Process only if transfer is active
                transfer.acknowledgedChunks += 1;
                // Optional: Could call onProgress with 'acknowledged' status if needed
                // const ackProgress = (transfer.acknowledgedChunks / transfer.totalChunks) * 100;
                // transfer.onProgress(ackProgress, 'acknowledged');
            }
        } else if (data.type === 'file-ack') {
            console.log(`Received file-ack for ${data.fileName} with status ${data.status} from ${senderId}`);
            const transferId = getTransferId(data.fileName, senderId);
            const transfer = outgoingTransfersRef.current[transferId];

            if (transfer) {
                if (data.status === 'complete') {
                    transfer.isCompleteConfirmed = true; // Mark as confirmed by receiver
                    transfer.onProgress(100, 'complete'); // Signal final completion to UI
                    console.log(`File transfer ${transferId} confirmed complete by receiver.`);
                } else {
                    // Handle incomplete/error status from receiver
                    transfer.onProgress(transfer.acknowledgedChunks / transfer.totalChunks * 100, 'error'); // Report error status
                    console.error(`File transfer ${transferId} failed or was incomplete on receiver side.`);
                }
                // Clean up the transfer tracking once acknowledged (success or fail)
                delete outgoingTransfersRef.current[transferId];
            } else {
                console.warn(`Received file-ack for unknown or already cleaned-up transfer: ${transferId}`);
            }
        } else {
            console.warn("Received unknown data type:", data?.type);
        }
    }, []) // Removed peers dependency as senderId comes from connection

    const setupConnectionListeners = useCallback((conn: DataConnection) => {
        const map = connectionListenersMapRef.current;

        if (!map.has(conn)) {
            console.log(`Setting up listeners for connection with ${conn.peer}`);
            conn.on('data', (data: any) => {
                // Pass the connection itself to the handler
                handleIncomingData(data, conn);
            });
            conn.on('close', () => {
                console.log(`Connection closed with ${conn.peer}`);
                map.delete(conn); // Clean up listener map
                setPeers(prev => prev.filter(p => p.id !== conn.peer));
                setIsConnected(peers.length > 1); // Update connected status
                // Optionally cancel ongoing transfers with this peer
                Object.keys(outgoingTransfersRef.current).forEach(transferId => {
                    const transfer = outgoingTransfersRef.current[transferId];
                    if (transfer.peerId === conn.peer && !transfer.isCompleteConfirmed) {
                        console.warn(`Cancelling transfer ${transfer.fileName} due to connection close with ${conn.peer}`);
                        transfer.onProgress(transfer.sentChunks / transfer.totalChunks * 100, 'error');
                        delete outgoingTransfersRef.current[transferId];
                    }
                });
            });
            conn.on('error', (err) => {
                console.error(`Connection error with ${conn.peer}:`, err);
                map.delete(conn); // Clean up listener map
                setPeers(prev => prev.filter(p => p.id !== conn.peer));
                setIsConnected(peers.length > 1);
                // Optionally cancel ongoing transfers with this peer similar to 'close'
                Object.keys(outgoingTransfersRef.current).forEach(transferId => {
                    const transfer = outgoingTransfersRef.current[transferId];
                    if (transfer.peerId === conn.peer && !transfer.isCompleteConfirmed) {
                        console.warn(`Cancelling transfer ${transfer.fileName} due to connection error with ${conn.peer}`);
                        transfer.onProgress(transfer.sentChunks / transfer.totalChunks * 100, 'error');
                        delete outgoingTransfersRef.current[transferId];
                    }
                });
            });
            map.set(conn, true);
            return true;
        } else {
            console.log(`Listeners already exist for connection with ${conn.peer}`);
            return false;
        }
    }, [handleIncomingData, peers.length]); // Added peers.length dependency for setIsConnected


    useEffect(() => {
        const initializePeer = () => {
            let currentPeer: Peer | null = null;
            let peerIdToDestroy: string | null = null;

            const createPeer = () => {
                const shortId = generateShortId()
                console.log("Attempting to initialize PeerJS with ID:", shortId);
                const peer = new Peer(shortId, {
                    debug: 0, // Set to 1 or 2 for more verbose PeerJS logs
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' },
                        ],
                    },
                })
                currentPeer = peer;
                peerIdToDestroy = shortId; // Store the ID we attempted to create

                peer.on('open', (id) => {
                    console.log('PeerJS connection open. My Peer ID is:', id);
                    setMyPeerId(id)
                    setPeerInstance(peer)
                    peerIdToDestroy = null; // Successfully opened, don't destroy this one later
                })

                peer.on('connection', (conn) => {
                    console.log(`Incoming connection from ${conn.peer}`);
                    conn.on('open', () => {
                        console.log(`Data connection opened with ${conn.peer}`);
                        if (setupConnectionListeners(conn)) {
                            setPeers(prev => {
                                const existingPeerIndex = prev.findIndex(p => p.id === conn.peer)
                                if (existingPeerIndex === -1) {
                                    console.log(`Adding new peer: ${conn.peer}`);
                                    return [...prev, { id: conn.peer, connection: conn, lastSeen: Date.now() }]
                                } else {
                                    console.log(`Updating existing peer connection: ${conn.peer}`);
                                    // Close the old connection before replacing? PeerJS might handle this.
                                    // prev[existingPeerIndex].connection?.close();
                                    const newPeers = [...prev]
                                    newPeers[existingPeerIndex] = { id: conn.peer, connection: conn, lastSeen: Date.now() }
                                    return newPeers
                                }
                            })
                            setIsConnected(true);
                        }
                    });
                })

                peer.on('error', (err) => {
                    console.error('PeerJS error:', err.type, err);
                    // Specific handling for ID taken
                    if (err.type === 'unavailable-id') {
                        console.warn(`Peer ID ${shortId} is already taken. Retrying...`);
                        peer.destroy(); // Clean up the failed peer instance
                        setTimeout(createPeer, 100); // Retry after a short delay
                    } else if (err.type !== 'peer-unavailable') {
                        // Handle other significant errors if needed
                        // Maybe reset state or inform the user
                    }
                })

                peer.on('disconnected', () => {
                    console.warn('PeerJS disconnected from signaling server. Attempting to reconnect...');
                    // PeerJS attempts reconnection automatically by default unless destroy() is called.
                    // We might want to update UI state here to indicate potential issues.
                    // setIsConnected(false); // Or a specific "reconnecting" state
                });

                peer.on('close', () => {
                    console.log('PeerJS connection closed.');
                    // This happens when destroy() is called.
                });
            }

            createPeer(); // Start the creation process

            return () => {
                console.log("Cleaning up PeerJS instance...");
                if (currentPeer) {
                    currentPeer.destroy()
                    console.log(`Peer ${currentPeer.id || peerIdToDestroy} destroyed.`);
                } else if (peerIdToDestroy) {
                    console.warn(`Peer instance for ID ${peerIdToDestroy} might not have been fully created or was already destroyed.`);
                }
                setPeerInstance(null);
                setMyPeerId('');
                setPeers([]);
                setIsConnected(false);
                outgoingTransfersRef.current = {}; // Clear outgoing transfers on cleanup
            }
        }

        initializePeer()

    }, [generateShortId, setupConnectionListeners]) // setupConnectionListeners is stable due to useCallback

    const connectToPeer = useCallback(async (peerId: string): Promise<void> => {
        if (!peerInstance || !myPeerId) {
            console.error("Peer instance not available for connecting.");
            throw new Error("Peer not initialized");
        }
        if (peerId === myPeerId) {
            console.error("Cannot connect to self.");
            throw new Error("Cannot connect to self");
        }
        if (peers.some(p => p.id === peerId)) {
            console.warn(`Already connected or connecting to ${peerId}`);
            // Maybe return early or resolve? For now, let it try again.
            // return;
        }


        console.log(`Attempting to connect to peer: ${peerId}`);
        return new Promise((resolve, reject) => {
            try {
                const conn = peerInstance.connect(peerId, {
                    reliable: true, // Use reliable transport (uses SCTP)
                    metadata: { sender: myPeerId }
                });

                conn.on('open', () => {
                    console.log(`Data connection opened with ${peerId}`);
                    if (setupConnectionListeners(conn)) {
                        setPeers(prev => {
                            const existingPeerIndex = prev.findIndex(p => p.id === peerId)
                            if (existingPeerIndex === -1) {
                                console.log(`Adding new peer via connect: ${peerId}`);
                                return [...prev, { id: peerId, connection: conn, lastSeen: Date.now() }]
                            } else {
                                console.log(`Updating existing peer connection via connect: ${peerId}`);
                                // prev[existingPeerIndex].connection?.close(); // Close old?
                                const newPeers = [...prev]
                                newPeers[existingPeerIndex] = { id: peerId, connection: conn, lastSeen: Date.now() }
                                return newPeers
                            }
                        })
                        setIsConnected(true);
                    }
                    resolve(); // Resolve promise on successful connection open
                });

                conn.on('error', (err) => {
                    console.error(`Connection error with ${peerId}:`, err);
                    // Remove peer if connection fails?
                    setPeers(prev => prev.filter(p => p.id !== peerId));
                    setIsConnected(peers.length > 1);
                    reject(err); // Reject promise on error
                });
                conn.on('close', () => {
                    console.log(`Connection closed with ${peerId} during connect attempt.`);
                    // Usually means the remote peer destroyed the connection or peer instance.
                    setPeers(prev => prev.filter(p => p.id !== peerId));
                    setIsConnected(peers.length > 1);
                    reject(new Error('Connection closed by peer')); // Reject promise on close before open
                });

            } catch (error) {
                console.error(`Failed to initiate connection to ${peerId}:`, error);
                reject(error); // Reject promise on initial connect error
            }
        });

    }, [peerInstance, myPeerId, setupConnectionListeners, peers.length]) // Added peers.length

    const sendFile = useCallback(async (file: File, peerId: string, onProgress: (progress: number, status: TransferStatus) => void) => {
        const peer = peers.find(p => p.id === peerId)
        if (!peer?.connection || !peer.connection.open) {
            console.error(`No open connection found for peer ${peerId}`);
            onProgress(0, 'error'); // Signal error immediately
            throw new Error(`No open connection to peer ${peerId}`);
        }

        const connection = peer.connection;
        const chunkSize = 64 * 1024 // 64 KB
        const totalChunks = Math.ceil(file.size / chunkSize)
        const transferId = getTransferId(file.name, peerId)
        console.log(`Starting file send: ${file.name} to ${peerId}, Size: ${file.size}, Chunks: ${totalChunks}`);

        outgoingTransfersRef.current[transferId] = {
            fileName: file.name,
            peerId,
            totalChunks,
            sentChunks: 0,
            acknowledgedChunks: 0,
            onProgress,
            isCompleteConfirmed: false,
        }

        // Send file-start message
        try {
            connection.send({
                type: 'file-start',
                fileName: file.name,
                totalChunks,
                fileSize: file.size
            });
        } catch (error) {
            console.error(`Error sending file-start for ${file.name} to ${peerId}:`, error);
            onProgress(0, 'error');
            delete outgoingTransfersRef.current[transferId];
            throw error; // Rethrow to stop the process
        }


        onProgress(0, 'sending'); // Initial progress update

        // Function to send a specific chunk
        const sendChunk = async (chunkIndex: number): Promise<boolean> => {
            // Check if connection is still open before sending each chunk
            if (!connection.open) {
                console.error(`Connection to ${peerId} closed before sending chunk ${chunkIndex} of ${file.name}`);
                return false; // Indicate failure
            }

            const start = chunkIndex * chunkSize
            const end = Math.min(start + chunkSize, file.size)
            const chunk = await file.slice(start, end).arrayBuffer()

            return new Promise((resolve) => {
                const trySend = () => {
                    // Check connection again right before sending
                    if (!connection.open) {
                        console.error(`Connection to ${peerId} closed while trying to send chunk ${chunkIndex} of ${file.name}`);
                        resolve(false); // Indicate failure
                        return;
                    }
                    try {
                        connection.send({
                            type: 'file-chunk',
                            chunk,
                            chunkIndex,
                            // No need to send totalChunks or fileName in every chunk if receiver tracks it from file-start
                            fileName: file.name // Sending filename for safety/simpler receiver logic
                        });

                        // Update progress based on sending the chunk
                        const transfer = outgoingTransfersRef.current[transferId];
                        if (transfer && !transfer.isCompleteConfirmed) {
                            transfer.sentChunks += 1;
                            const sentProgress = (transfer.sentChunks / transfer.totalChunks) * 100;
                            transfer.onProgress(sentProgress, 'sending');
                        }
                        resolve(true); // Indicate success
                    } catch (error) {
                        // This catch block might not be reliable for DataConnection send errors (like buffer full)
                        // PeerJS handles buffering internally to some extent.
                        // If send fails persistently, the connection might close or error out.
                        console.warn(`Error during trySend chunk ${chunkIndex} (might retry or fail later):`, error);
                        // Simple retry - could implement backoff or max retries
                        setTimeout(trySend, 100);
                        // For now, resolve(false) on immediate error might be too aggressive. Let PeerJS handle it.
                        // Consider resolving false only after multiple failed retries.
                        // Let's assume PeerJS handles buffering and resolve true optimistically,
                        // relying on connection close/error events for hard failures.
                        // resolve(false);
                    }
                }
                trySend()
            })
        }

        // Send all chunks sequentially
        for (let i = 0; i < totalChunks; i++) {
            const success = await sendChunk(i);
            if (!success) {
                console.error(`Failed to send chunk ${i} for ${file.name}. Aborting transfer.`);
                onProgress(outgoingTransfersRef.current[transferId]?.sentChunks / totalChunks * 100 || 0, 'error');
                delete outgoingTransfersRef.current[transferId];
                throw new Error(`Failed to send chunk ${i}`);
            }
            // Optional: Add a small delay if buffer issues persist despite reliable=true
            // await new Promise(resolve => setTimeout(resolve, 5));
        }

        // Send file-end message after all chunks are sent
        if (connection.open) {
            try {
                connection.send({
                    type: 'file-end',
                    fileName: file.name,
                });
                console.log(`Sent file-end for ${file.name} to ${peerId}`);
            } catch (error) {
                console.error(`Error sending file-end for ${file.name} to ${peerId}:`, error);
                // Don't necessarily mark as error yet, wait for potential file-ack timeout/failure
            }
        } else {
            console.error(`Connection to ${peerId} closed before sending file-end for ${file.name}`);
            onProgress(outgoingTransfersRef.current[transferId]?.sentChunks / totalChunks * 100 || 0, 'error');
            delete outgoingTransfersRef.current[transferId];
            throw new Error('Connection closed before sending file-end');
        }

        // --- Removed timeout check - completion is now driven by file-ack ---

    }, [peers]) // Depends on the peers list to find the connection

    return {
        myPeerId,
        peers,
        connectToPeer,
        sendFile,
        isConnected,
        receivingFiles
    }
}