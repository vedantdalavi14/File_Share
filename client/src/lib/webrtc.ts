export interface FileChunk {
  id: string;
  index: number;
  totalChunks: number;
  data: ArrayBuffer;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface FileTransferProgress {
  id: string;
  fileName: string;
  fileSize: number;
  bytesTransferred: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private activeChannels: RTCDataChannel[] = [];
  private onProgressCallback: ((progress: FileTransferProgress) => void) | null = null;
  private onFileReceivedCallback: ((file: Blob, fileName: string, transferId: string) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: string) => void) | null = null;
  
  // File transfer state
  private receivedChunks: Map<number, ArrayBuffer> = new Map();
  private expectedChunks = 0;
  private currentFileName = "";
  private currentFileSize = 0;
  private currentFileType = "";
  private transferStartTime = 0;
  private lastProgressTime = 0;
  private lastProgressBytes = 0;
  private fileReconstructionTriggered = false;
  private lastReceiverProgressUpdateTime = 0;
  private sentFile: File | null = null;
  private missingChunkRetries = 0;
  private readonly MAX_RETRIES = 5;
  private currentTransferId: string | null = null;

  // Optimization properties
  private readonly MAX_PARALLEL_CHANNELS = 10;
  private readonly CHUNK_SIZE = 260000; // Just under the 256KB limit to allow for headers
  private readonly ACK_CHANNEL_INDEX = 0; // Use the primary channel for ACKs
  private readonly ACK_INTERVAL = 200; // Send ACK every 200ms
  private lastAckTime = 0;

  constructor() {
    this.setupPeerConnection();
  }

  public resetTransferState() {
    console.log('[WebRTC] 🧼 Resetting transfer state for next file.');
    this.receivedChunks.clear();
    this.expectedChunks = 0;
    this.currentFileName = "";
    this.currentFileSize = 0;
    this.currentFileType = "";
    this.transferStartTime = 0;
    this.lastProgressTime = 0;
    this.lastProgressBytes = 0;
    this.fileReconstructionTriggered = false;
    this.sentFile = null;
    this.missingChunkRetries = 0;
    this.currentTransferId = null;
  }

  private setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState || 'disconnected';
      console.log('WebRTC connection state:', state);
      this.onConnectionStateChangeCallback?.(state);
    };
  }

  createDataChannels(): RTCDataChannel[] {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    this.activeChannels = [];
    for (let i = 0; i < this.MAX_PARALLEL_CHANNELS; i++) {
      const channel = this.peerConnection.createDataChannel(`fileTransfer-${i}`, { ordered: true });
      this.setupDataChannel(channel, i);
      this.activeChannels.push(channel);
    }
    return this.activeChannels;
  }

  private setupDataChannel(channel: RTCDataChannel, index: number) {
    channel.bufferedAmountLowThreshold = 8 * 1024 * 1024; // 8MB
    channel.onopen = () => console.log(`Data channel ${index} opened`);
    channel.onclose = () => console.log(`Data channel ${index} closed`);
    channel.onmessage = (event) => this.handleDataChannelMessage(event.data);
    channel.onerror = (error) => console.error(`Data channel ${index} error:`, error);
  }

  onDataChannel(callback: (channel: RTCDataChannel) => void) {
    if (!this.peerConnection) return;
    
    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      this.setupDataChannel(channel, this.activeChannels.length);
      this.activeChannels.push(channel);
      callback(channel);
    };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate) => void) {
    if (!this.peerConnection) return;
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) callback(event.candidate);
    };
  }

  async sendFile(file: File, id: string) {
    this.sentFile = file;
    this.currentTransferId = id;

    await Promise.all(this.activeChannels.map(channel => {
        if (channel.readyState === 'open') return Promise.resolve();
        return new Promise<void>(resolve => channel.onopen = () => resolve());
    }));

    if (this.activeChannels.every(c => c.readyState !== 'open')) {
      throw new Error('Data channels could not be opened');
    }

    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    
    const metadata = {
      type: 'file-metadata',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks,
      transferId: this.currentTransferId,
    };
    // Use a separate send function for metadata to avoid binary packet logic
    await this.sendWithBackpressure(this.activeChannels[0], JSON.stringify(metadata));

    this.transferStartTime = Date.now();
    this.lastProgressTime = Date.now();
    this.lastProgressBytes = 0;

    let channelIndex = 0;
    let lastProgressUpdateTime = 0;
    for (let i = 0; i < totalChunks; i++) {
        const channel = this.activeChannels[channelIndex];

        const start = i * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, file.size);
        const chunkData = await file.slice(start, end).arrayBuffer();

        const packet = this.createPacket(i, chunkData);
        
        await this.sendWithBackpressure(channel, packet);
        
        // SENDER progress is now driven by receiver ACKs, so we remove the old update logic here.
        
        channelIndex = (channelIndex + 1) % this.activeChannels.length;
    }

    // The sender no longer updates its own progress bar directly upon sending.
    // It waits for ACKs from the receiver.

    // Wait for all channel buffers to drain before sending completion
    const waitForDraining = () => {
      return new Promise<void>(resolve => {
        const check = () => {
          if (this.activeChannels.every(c => c.bufferedAmount === 0)) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    };

    await waitForDraining();
    await this.sendWithBackpressure(this.activeChannels[0], JSON.stringify({ type: 'file-complete' }));
  }

  private createPacket(index: number, data: ArrayBuffer): ArrayBuffer {
    // 3-byte header: [index (2 bytes), checksum (1 byte)]
    const header = new ArrayBuffer(3);
    const headerView = new DataView(header);
    headerView.setUint16(0, index, true); // Little-endian for wide compatibility
    headerView.setUint8(2, this.quickChecksum(data));

    const packet = new Uint8Array(3 + data.byteLength);
    packet.set(new Uint8Array(header));
    packet.set(new Uint8Array(data), 3);
    return packet.buffer;
  }

  private quickChecksum(data: ArrayBuffer): number {
    // Fast 8-bit XOR checksum
    return new Uint8Array(data).reduce((sum, byte) => sum ^ byte, 0);
  }

  private async sendWithBackpressure(channel: RTCDataChannel, data: string | ArrayBuffer) {
    while (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
      await new Promise<void>(resolve => {
          channel.onbufferedamountlow = () => {
              channel.onbufferedamountlow = null;
              resolve();
          };
      });
    }

    if (channel.readyState !== 'open') {
        console.warn(`Channel ${channel.label} is not open, skipping send.`);
        return;
    }
    
    if (typeof data === 'string') {
      channel.send(data);
    } else {
      channel.send(data);
    }
  }

  private updateProgress(fileName: string, fileSize: number, bytesTransferred: number) {
    const now = Date.now();
    const timeDiff = (now - this.lastProgressTime) / 1000 || 1;
    const bytesDiff = bytesTransferred - this.lastProgressBytes;
    const speed = bytesDiff / timeDiff;
    const percentage = (bytesTransferred / fileSize) * 100;
    const timeRemaining = speed > 0 ? (fileSize - bytesTransferred) / speed : Infinity;

    const progress: FileTransferProgress = {
      id: this.currentTransferId!,
      fileName,
      fileSize,
      bytesTransferred,
      percentage,
      speed,
      timeRemaining,
    };

    this.onProgressCallback?.(progress);
    this.lastProgressTime = now;
    this.lastProgressBytes = bytesTransferred;
  }

  private handleDataChannelMessage(data: any) {
    try {
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        if (message.type === 'file-metadata') {
          this.receivedChunks.clear();
          this.expectedChunks = message.totalChunks;
          this.currentFileName = message.fileName;
          this.currentFileSize = message.fileSize;
          this.currentFileType = message.fileType;
          this.currentTransferId = message.transferId;
          this.transferStartTime = Date.now();
          this.fileReconstructionTriggered = false;
          this.missingChunkRetries = 0;
        } else if (message.type === 'file-complete') {
          this.reconstructAndDownloadFile();
        } else if (message.type === 'request-missing-chunks') {
          this.resendChunks(message.indices);
        } else if (message.type === 'progress-ack') {
          // Receiver is acknowledging progress, update sender's UI
          this.updateProgress(this.sentFile!.name, this.sentFile!.size, message.bytesReceived);
        }
      } else if (data instanceof ArrayBuffer) {
        // Binary packet: [index (2 bytes), checksum (1 byte), ...chunkData]
        const headerView = new DataView(data, 0, 3);
        const index = headerView.getUint16(0, true);
        const checksum = headerView.getUint8(2);
        const chunkData = data.slice(3);

        if (this.quickChecksum(chunkData) === checksum) {
            this.receivedChunks.set(index, chunkData);
        
            const bytesReceived = Array.from(this.receivedChunks.values()).reduce((sum, chunk) => sum + chunk.byteLength, 0);
            
            const now = Date.now();

            // The receiver ALWAYS updates its own progress bar
            if (now - this.lastReceiverProgressUpdateTime > 100) {
                this.updateProgress(this.currentFileName, this.currentFileSize, bytesReceived);
                this.lastReceiverProgressUpdateTime = now;
            }

            // And sends acknowledgements back to the sender
            if (now - this.lastAckTime > this.ACK_INTERVAL) {
              this.activeChannels[this.ACK_CHANNEL_INDEX].send(JSON.stringify({
                type: 'progress-ack',
                bytesReceived: bytesReceived,
              }));
              this.lastAckTime = now;
            }

            if (this.receivedChunks.size === this.expectedChunks) {
              this.reconstructAndDownloadFile();
            }
        } else {
            console.warn(`Checksum mismatch for chunk ${index}. Packet discarded.`);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  private async resendChunks(indices: number[]) {
    if (!this.sentFile) {
        console.error("No file available for resending chunks.");
        return;
    }
    console.log(`Resending ${indices.length} chunks.`);

    for (const index of indices) {
        const start = index * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, this.sentFile.size);
        const chunkData = await this.sentFile.slice(start, end).arrayBuffer();
        const packet = this.createPacket(index, chunkData);
        // Resend on the primary channel for simplicity
        await this.sendWithBackpressure(this.activeChannels[0], packet);
    }
  }

  private reconstructAndDownloadFile() {
    if (this.fileReconstructionTriggered) return;

    if (this.receivedChunks.size !== this.expectedChunks) {
        if (this.missingChunkRetries < this.MAX_RETRIES) {
            this.missingChunkRetries++;
            const missingIndices: number[] = [];
            for (let i = 0; i < this.expectedChunks; i++) {
                if (!this.receivedChunks.has(i)) {
                    missingIndices.push(i);
                }
            }
            // Only request if there are indeed missing chunks
            if (missingIndices.length > 0) {
                console.warn(`Requesting ${missingIndices.length} missing chunks, attempt ${this.missingChunkRetries}`);
                this.activeChannels[0].send(JSON.stringify({
                    type: 'request-missing-chunks',
                    indices: missingIndices
                }));
            }
        } else {
            console.error(`File reconstruction failed after ${this.MAX_RETRIES} retries. Missing ${this.expectedChunks - this.receivedChunks.size} chunks.`);
        }
        return;
    }
    
    this.fileReconstructionTriggered = true;

    this.updateProgress(this.currentFileName, this.currentFileSize, this.currentFileSize);
    
    // Final acknowledgement to sync sender's progress to 100%
    this.activeChannels[this.ACK_CHANNEL_INDEX].send(JSON.stringify({
      type: 'progress-ack',
      bytesReceived: this.currentFileSize,
    }));

    // Pre-allocate array and fill it in order for performance
    const chunks = new Array(this.expectedChunks);
    for (let i = 0; i < this.expectedChunks; i++) {
        chunks[i] = this.receivedChunks.get(i);
    }
    
    const blob = new Blob(chunks, { type: this.currentFileType });
    this.onFileReceivedCallback?.(blob, this.currentFileName, this.currentTransferId!);
  }

  public onFileReceived(callback: (file: Blob, fileName: string, transferId: string) => void) {
    this.onFileReceivedCallback = callback;
  }

  public onProgress(callback: (progress: FileTransferProgress) => void) {
    this.onProgressCallback = callback;
  }
  onConnectionStateChange(callback: (state: string) => void) { this.onConnectionStateChangeCallback = callback; }

  close(soft = false) {
    if (soft) {
        console.log('[WebRTC] 🔌 Soft closing peer connection, preparing for reconnect.');
        this.activeChannels = []; // Clear old channels
        if (this.peerConnection) {
            this.peerConnection.close();
            this.setupPeerConnection(); // Re-initialize for future connections
        }
    } else {
        console.log('[WebRTC] 🚫 Hard closing peer connection and all channels.');
        this.activeChannels.forEach(channel => channel.close());
        this.activeChannels = [];
        if (this.peerConnection) {
            this.peerConnection.onconnectionstatechange = null;
            this.peerConnection.onicecandidate = null;
            this.peerConnection.ondatachannel = null;
            this.peerConnection.close();
            this.peerConnection = null;
        }
    }
    this.resetTransferState();
  }

  getConnectionState(): string {
    return this.peerConnection?.connectionState || 'disconnected';
  }
}
