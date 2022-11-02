/**
 * srs webrtc palyer
 * auth Caner
 */
class WebRtcPlayer {
    private Peer: any
    private TIMER: any
    constructor(option: { HOST: string; TOKEN: string; UUID: string; PROFILE: number; PORT: number; DOM: HTMLVideoElement }) {
        this.initWebRtc(option.HOST, option.PORT, option.TOKEN, option.UUID, option.PROFILE, option.DOM).then(res => {
            this.Peer = res
        }).catch(() => {
            this.Peer = null
        })
    }
    /**
     * 同步睡眠
     * @param ms 毫秒
     * @returns
     */
    private sleep(ms: number) { return new Promise((resolve) => { setTimeout(resolve, ms) }) }

    /**
     * 初始化webrtc
     * @param HOST 媒体服务器地址
     * @param TOKEN 用户token
     * @param UUID 摄像头uuid
     * @param PROFILE 码流
     * @param DOM video节点
     * @returns 
     */
    private async initWebRtc(HOST: string, PORT: number, TOKEN: string, UUID: string, PROFILE: number, DOM: HTMLVideoElement) {
        try {
            const Peer = new RTCPeerConnection() as any
            Peer.addTransceiver('video', { direction: 'recvonly' })
            const offer = await Peer.createOffer()
            await Peer.setLocalDescription(offer)

            // 监听视频=播放
            Peer.ontrack = (event: Event | any) => {
                if (DOM) {
                    const { streams } = event
                    DOM.srcObject = streams[0]
                    console.log('track', event)
                }
            }

            Peer.oniceconnectionstatechange = () => {
                const state = Peer.iceConnectionState
                console.log('ICE状态', state)
            }

            Peer.onicegatheringstatechange = () => {
                console.log('GatheringState: ', Peer.iceGatheringState)
            }

            Peer.onconnectionstatechange = () => {
                const state = Peer.connectionState
                console.log('连接状态', state)
            }

            // SDP SRS params
            const params = {
                api: `http://${HOST}:${PORT}/rtc/v1/play/?token=${TOKEN}&uuid=${UUID}&stream=${UUID + PROFILE}&profile=${PROFILE}`,
                clientip: null,
                sdp: offer.sdp,
                streamurl: `webrtc://${HOST}/live/${UUID + PROFILE}?token=${TOKEN}&uuid=${UUID}&stream=${UUID + PROFILE}&profile=${PROFILE}`,
                tid: Number(Math.floor(new Date().getTime() * Math.random() * 100)).toString(16).slice(0, 7)
            }
            console.log('params', params)

            // 发送offer
            const res = await window.fetch(params.api, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            })

            // 接收 answer
            const { sdp } = await res.json()
            if (sdp) await Peer.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))

            return Peer
        } catch (error) {
            console.warn('webRtcInit:', error);
            return null
        }
    }

    /**
     * 云台控制
     * @param URL 
     * @param UUID 
     * @param TOKEN 
     * @param command 指令:数字键盘1-9去掉5,10:焦距放大,11:焦距缩小 12:亮度,13:色彩饱和度,14:对比度,15:清晰度
     * @param number [云台速度|焦距参数|色彩饱和度]等值  亮度值 0-100
     * @returns 
     */
    public contrl(URL: string, UUID: string, TOKEN: string, command: number, number: number) {
        if (!UUID) return
        if (this.TIMER !== null) clearTimeout(this.TIMER)
        this.TIMER = setTimeout(() => {
            window.fetch(URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: 'cloudcontrol.control',
                    token: TOKEN,
                    body: {
                        uuid: UUID,
                        command,
                        number
                    }
                })
            })
        }, 500);
    }

    /**
     * 视频截图
     * @param option 
     * @returns base64
     */
    public capPhoto(DOM: HTMLVideoElement) {
        const canvas = document.createElement('canvas')
        canvas.width = DOM.offsetWidth
        canvas.height = DOM.offsetHeight
        const context = canvas.getContext('2d')
        context?.drawImage(DOM, 0, 0, DOM.offsetWidth, DOM.offsetHeight)
        const base64 = canvas.toDataURL('image/jpg')
        return base64
    }

    /**
     * 视频录像
     * @param DOM 
     * @param TIME ms
     * @returns 
     */
    public async capVideo(DOM: HTMLVideoElement, TIME: number) {
        const recordedBlobs = [] as any
        const MediaStream = DOM['srcObject'] as MediaStream
        const mediaRecorder = new MediaRecorder(MediaStream, { mimeType: 'video/webm;codecs=h264' })
        mediaRecorder.ondataavailable = (event: { data: { size: number } }) => {
            if (event.data && event.data.size > 0) {
                recordedBlobs.push(event.data);
            }
        }
        mediaRecorder.start()
        await this.sleep(TIME || 1000 * 3)
        mediaRecorder.stop()
        return await new Promise((resolve, reject) => {
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedBlobs, { type: 'video/mp4' });
                resolve(blob)
            }
            mediaRecorder.onerror = reject
        })
    }

    /**
     * 关闭webrtc
     */
    public async close() {
        if (this.Peer) this.Peer.close()
        if (this.TIMER) clearTimeout(this.TIMER)
    }

}

export default WebRtcPlayer